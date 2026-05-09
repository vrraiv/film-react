import {
  buildTasteProfile,
  type FeatureStats,
  type TasteFeatureOccurrence,
  type TasteProfile,
} from '../tasteProfile/tasteProfile'
import {
  DEFAULT_RECOMMENDER_CONFIG,
  FEATURE_OVERRIDE_LABELS,
  type RecommenderConfig,
} from './recommenderConfig'
import {
  discoverTmdbMovies,
  fetchTmdbMovieCandidates,
  fetchTmdbMovieDetails,
  fetchTmdbMovieKeywords,
  type TmdbCandidateResult,
  type TmdbCandidateSource,
} from '../../services/tmdbService'
import type { FilmEntry, FilmTmdbMetadata } from '../../types/film'

export type RecommendationType =
  | 'safe_bet'
  | 'worth_the_gamble'
  | 'stretch_pick'
  | 'deep_cut'
  | 'underexplored_fit'
  | 'rewatch_candidate'

export type RecommendationCandidate = {
  title: string
  tmdbId: number
  posterUrl: string | null
  year: number | null
  genres: string[]
  runtime: number | null
  director: string | null
  writers: string[]
  cast: string[]
  countries: string[]
  languages: string[]
  keywords: string[]
  overview: string | null
  popularity: number | null
  voteAverage: number | null
  voteCount: number | null
  sources: TmdbCandidateSource[]
  sourceSeedIds: number[]
  watchedFilm: FilmEntry | null
}

export type FilmRecommendation = RecommendationCandidate & {
  interestScore: number
  expectedSatisfactionScore: number
  riskScore: number
  confidenceScore: number
  finalScore: number
  recommendationType: RecommendationType
  primaryReasons: string[]
  cautions: string[]
  similarLikedFilms: Array<{
    id: string
    title: string
    rating: number | null
  }>
  overrideReasons: string[]
}

export type BuildRecommendationsOptions = {
  includeWatched?: boolean
  seedTmdbId?: number | null
  maxSeeds?: number
  maxEnrichedCandidates?: number
  config?: RecommenderConfig
}

export const RECOMMENDATION_TUNING = {
  maxSeeds: 8,
  maxEnrichedCandidates: 36,
  profileFeatureWeight: 0.86,
  popularityPriorCap: 60,
  minimumFeatureConfidenceForReason: 0.22,
  rewatchRatingThreshold: 4.5,
} as const

const TMDB_GENRE_IDS_BY_NAME: Record<string, number> = {
  action: 28,
  adventure: 12,
  animation: 16,
  comedy: 35,
  crime: 80,
  documentary: 99,
  drama: 18,
  family: 10751,
  fantasy: 14,
  history: 36,
  horror: 27,
  music: 10402,
  mystery: 9648,
  romance: 10749,
  'science fiction': 878,
  'tv movie': 10770,
  thriller: 53,
  war: 10752,
  western: 37,
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value))

const normalizeKey = (value: string) => value.trim().toLowerCase()

const featureMapKey = (feature: TasteFeatureOccurrence) => `${feature.type}:${feature.key}`

const formatFeatureLabel = (feature: TasteFeatureOccurrence) => {
  if (feature.type === 'tmdb_genre') return feature.key
  if (feature.type === 'tmdb_keyword') return feature.key
  if (feature.type === 'director') return `director ${feature.key}`
  if (feature.type === 'decade') return feature.key
  if (feature.type === 'runtime_bucket') return `${feature.key} runtimes`
  return feature.key
}

const runtimeBucket = (runtime: number | null): string | null => {
  if (runtime === null) return null
  if (runtime < 90) return 'short'
  if (runtime < 121) return 'feature'
  if (runtime < 151) return 'long'
  return 'epic'
}

const candidateFeatures = (candidate: RecommendationCandidate): TasteFeatureOccurrence[] => {
  const features: TasteFeatureOccurrence[] = []
  const seen = new Set<string>()
  const add = (type: TasteFeatureOccurrence['type'], value: string | null | undefined) => {
    if (!value) return
    const key = normalizeKey(value)
    if (!key) return
    const id = `${type}:${key}`
    if (seen.has(id)) return
    seen.add(id)
    features.push({ type, key })
  }

  candidate.genres.forEach((genre) => add('tmdb_genre', genre))
  candidate.keywords.forEach((keyword) => add('tmdb_keyword', keyword))
  add('director', candidate.director)
  candidate.countries.forEach((country) => add('country', country))
  candidate.languages.forEach((language) => add('language', language))
  if (candidate.year !== null) add('decade', `${Math.floor(candidate.year / 10) * 10}s`)
  add('runtime_bucket', runtimeBucket(candidate.runtime))
  return features
}

const getWatchedTmdbId = (film: FilmEntry) => film.metadata.tmdb?.id ?? film.tmdbMetadata?.id ?? null

const getFilmTmdb = (film: FilmEntry): FilmTmdbMetadata | null => film.metadata.tmdb ?? film.tmdbMetadata ?? null

const buildSeedFilms = (
  films: FilmEntry[],
  options: BuildRecommendationsOptions,
  config: RecommenderConfig,
): FilmEntry[] => {
  if (options.seedTmdbId) {
    return films.filter((film) => getWatchedTmdbId(film) === options.seedTmdbId)
  }

  return films
    .filter((film) => film.rating !== null && film.rating >= config.ratingPositiveThreshold && getWatchedTmdbId(film) !== null)
    .sort((left, right) =>
      (right.rating ?? 0) - (left.rating ?? 0) ||
      right.dateWatched.localeCompare(left.dateWatched),
    )
    .slice(0, options.maxSeeds ?? RECOMMENDATION_TUNING.maxSeeds)
}

const highAffinityGenreIds = (profile: TasteProfile) =>
  profile.features
    .filter((feature) =>
      feature.feature.type === 'tmdb_genre' &&
      ['safe_bet_zone', 'high_interest_mixed_results', 'underexplored_high_upside'].includes(feature.classification),
    )
    .sort((left, right) => right.affinityScore - left.affinityScore)
    .map((feature) => TMDB_GENRE_IDS_BY_NAME[feature.feature.key])
    .filter((genreId): genreId is number => typeof genreId === 'number')
    .slice(0, 3)

const mergeCandidate = (
  current: Map<number, TmdbCandidateResult & { sources: TmdbCandidateSource[]; sourceSeedIds: number[] }>,
  candidate: TmdbCandidateResult,
  sourceSeedId: number | null,
) => {
  const existing = current.get(candidate.id)
  if (!existing) {
    current.set(candidate.id, {
      ...candidate,
      sources: [candidate.source],
      sourceSeedIds: sourceSeedId === null ? [] : [sourceSeedId],
    })
    return
  }

  if (!existing.sources.includes(candidate.source)) existing.sources.push(candidate.source)
  if (sourceSeedId !== null && !existing.sourceSeedIds.includes(sourceSeedId)) existing.sourceSeedIds.push(sourceSeedId)
}

const enrichCandidate = async (
  candidate: TmdbCandidateResult & { sources: TmdbCandidateSource[]; sourceSeedIds: number[] },
  watchedByTmdbId: Map<number, FilmEntry>,
): Promise<RecommendationCandidate | null> => {
  try {
    const [details, keywordsResponse] = await Promise.all([
      fetchTmdbMovieDetails(candidate.id),
      fetchTmdbMovieKeywords(candidate.id).catch(() => ({ keywords: [] })),
    ])
    const watchedFilm = watchedByTmdbId.get(candidate.id) ?? null

    return {
      title: details.title || candidate.title,
      tmdbId: details.id,
      posterUrl: details.posterUrl ?? candidate.posterUrl,
      year: details.releaseYear,
      genres: details.genres,
      runtime: details.runtime,
      director: details.director,
      writers: details.writers,
      cast: details.cast,
      countries: details.countries,
      languages: details.languages,
      keywords: keywordsResponse.keywords,
      overview: details.overview,
      popularity: details.popularity ?? candidate.popularity,
      voteAverage: details.voteAverage ?? candidate.voteAverage,
      voteCount: details.voteCount ?? candidate.voteCount,
      sources: candidate.sources,
      sourceSeedIds: candidate.sourceSeedIds,
      watchedFilm,
    }
  } catch (error) {
    console.warn('Skipping TMDb candidate after enrichment failure', candidate.id, error)
    return null
  }
}

const bayesianRating = (
  voteAverage: number | null,
  voteCount: number | null,
  config: RecommenderConfig,
): number | null => {
  if (voteAverage === null) return null
  const v = voteCount ?? 0
  const m = config.voteShrinkagePrior
  const C = config.voteShrinkageMean
  return (v * voteAverage + m * C) / (v + m)
}

const tmdbPriorScore = (candidate: RecommendationCandidate, config: RecommenderConfig) => {
  const shrunk = bayesianRating(candidate.voteAverage, candidate.voteCount, config)
  const votePrior = shrunk === null ? 0.4 : clamp01(shrunk / 10)
  const popularityPrior = candidate.popularity === null
    ? 0.35
    : clamp01(Math.log10(candidate.popularity + 1) / Math.log10(RECOMMENDATION_TUNING.popularityPriorCap + 1))

  return votePrior * 0.72 + popularityPrior * 0.28
}

const weightedAverage = (
  matches: FeatureStats[],
  selector: (feature: FeatureStats) => number,
  fallback: number,
) => {
  const weighted = matches.reduce((acc, feature) => {
    const weight = Math.max(feature.confidenceScore, 0.12) * Math.max(feature.affinityScore, 0.12)
    return {
      value: acc.value + selector(feature) * weight,
      weight: acc.weight + weight,
    }
  }, { value: 0, weight: 0 })

  return weighted.weight === 0 ? fallback : weighted.value / weighted.weight
}

const explain = (
  candidate: RecommendationCandidate,
  matches: FeatureStats[],
  sourceSeeds: FilmEntry[],
  config: RecommenderConfig,
) => {
  const strongMatches = matches
    .filter((feature) => feature.confidenceScore >= RECOMMENDATION_TUNING.minimumFeatureConfidenceForReason)
    .sort((left, right) =>
      right.affinityScore + right.expectedSatisfactionScore - (left.affinityScore + left.expectedSatisfactionScore),
    )

  const primaryReasons = strongMatches
    .slice(0, 4)
    .map((feature) =>
      `${formatFeatureLabel(feature.feature)}: ${feature.count} logged films, ${(feature.hitRateAtLeast4 ?? 0) * 100 >= 1 ? `${((feature.hitRateAtLeast4 ?? 0) * 100).toFixed(0)}% 4+` : 'limited rating history'}`,
    )

  if (candidate.sources.includes('recommendations')) {
    primaryReasons.unshift('TMDb recommends it from one or more highly rated diary seeds.')
  } else if (candidate.sources.includes('similar')) {
    primaryReasons.unshift('TMDb marks it as similar to one or more highly rated diary seeds.')
  }

  const cautions = strongMatches
    .filter((feature) => feature.riskScore >= 0.45 || feature.classification === 'high_interest_mixed_results')
    .slice(0, 3)
    .map((feature) =>
      `${formatFeatureLabel(feature.feature)} has high interest but mixed outcomes in the diary.`,
    )

  if (candidate.runtime === null) cautions.push('Runtime is unavailable, so runtime fit is not scored.')
  if (candidate.keywords.length === 0) cautions.push('TMDb keywords are unavailable, lowering explanation confidence.')

  const overrideReasons = strongMatches
    .filter((feature) => feature.override && feature.overrideImpact)
    .slice(0, 3)
    .map((feature) =>
      `${FEATURE_OVERRIDE_LABELS[feature.override ?? 'neutral']} override on ${formatFeatureLabel(feature.feature)}: ${feature.overrideImpact}`,
    )

  const similarLikedFilms = sourceSeeds
    .filter((film) => film.rating !== null && film.rating >= config.ratingPositiveThreshold)
    .slice(0, 4)
    .map((film) => ({
      id: film.id,
      title: film.title,
      rating: film.rating,
    }))

  return {
    primaryReasons: primaryReasons.slice(0, 5),
    cautions: cautions.slice(0, 4),
    similarLikedFilms,
    overrideReasons,
  }
}

const classifyRecommendation = (input: {
  candidate: RecommendationCandidate
  interestScore: number
  expectedSatisfactionScore: number
  riskScore: number
  confidenceScore: number
  finalScore: number
}): RecommendationType => {
  if (input.candidate.watchedFilm) return 'rewatch_candidate'
  if (input.interestScore >= 0.7 && input.expectedSatisfactionScore >= 0.74 && input.riskScore < 0.38 && input.confidenceScore >= 0.38) return 'safe_bet'
  if (input.interestScore >= 0.66 && input.riskScore >= 0.38 && input.expectedSatisfactionScore >= 0.66) return 'worth_the_gamble'
  if (input.confidenceScore < 0.34 && input.expectedSatisfactionScore >= 0.67) return 'underexplored_fit'
  if ((input.candidate.popularity ?? 0) < 12 && input.finalScore >= 0.6) return 'deep_cut'
  return 'stretch_pick'
}

const scoreCandidate = (
  candidate: RecommendationCandidate,
  profile: TasteProfile,
  films: FilmEntry[],
  config: RecommenderConfig,
): FilmRecommendation => {
  const featureByKey = new Map(profile.features.map((feature) => [featureMapKey(feature.feature), feature]))
  const matches = candidateFeatures(candidate)
    .map((feature) => featureByKey.get(featureMapKey(feature)))
    .filter((feature): feature is FeatureStats => Boolean(feature))

  const profileInterest = weightedAverage(matches, (feature) => feature.affinityScore, 0.35)
  const profileExpected = weightedAverage(matches, (feature) => feature.expectedSatisfactionScore, 0.58)
  const profileRisk = weightedAverage(matches, (feature) => feature.riskScore, 0.36)
  const matchConfidence = weightedAverage(matches, (feature) => feature.confidenceScore, 0.2)
  const metadataCompleteness = [
    candidate.genres.length > 0,
    candidate.runtime !== null,
    candidate.director !== null,
    candidate.keywords.length > 0,
  ].filter(Boolean).length / 4
  const seedBoost = clamp01(candidate.sourceSeedIds.length / 3) * 0.06
  const prior = tmdbPriorScore(candidate, config)

  const interestScore = clamp01(profileInterest * 0.82 + seedBoost + (candidate.sources.includes('discover') ? 0.03 : 0.06))
  const expectedSatisfactionScore = clamp01(
    profileExpected * RECOMMENDATION_TUNING.profileFeatureWeight +
    prior * config.tmdbPopularityPriorWeight,
  )
  const riskScore = clamp01(profileRisk * 0.82 + (1 - metadataCompleteness) * 0.12 + (matches.length === 0 ? 0.15 : 0))
  const confidenceScore = clamp01(matchConfidence * 0.68 + metadataCompleteness * 0.2 + clamp01(matches.length / 6) * 0.12)
  const finalScore = clamp01(
    interestScore * 0.32 +
    expectedSatisfactionScore * 0.36 +
    confidenceScore * 0.16 -
    riskScore * 0.18 +
    prior * 0.16,
  )
  const sourceSeeds = films.filter((film) => candidate.sourceSeedIds.includes(getWatchedTmdbId(film) ?? -1))
  const explanation = explain(candidate, matches, sourceSeeds, config)
  const recommendationType = classifyRecommendation({
    candidate,
    interestScore,
    expectedSatisfactionScore,
    riskScore,
    confidenceScore,
    finalScore,
  })

  return {
    ...candidate,
    interestScore,
    expectedSatisfactionScore,
    riskScore,
    confidenceScore,
    finalScore,
    recommendationType,
    ...explanation,
  }
}

export const buildPersonalRecommendations = async (
  films: FilmEntry[],
  options: BuildRecommendationsOptions = {},
): Promise<FilmRecommendation[]> => {
  const config = options.config ?? DEFAULT_RECOMMENDER_CONFIG
  const profile = buildTasteProfile(films, config)
  const watchedByTmdbId = new Map<number, FilmEntry>()
  for (const film of films) {
    const tmdbId = getWatchedTmdbId(film)
    if (tmdbId !== null) watchedByTmdbId.set(tmdbId, film)
  }

  const seeds = buildSeedFilms(films, options, config)
  const rawCandidates = new Map<number, TmdbCandidateResult & { sources: TmdbCandidateSource[]; sourceSeedIds: number[] }>()

  for (const seed of seeds) {
    const seedTmdbId = getWatchedTmdbId(seed)
    if (seedTmdbId === null) continue
    const [recommendations, similar] = await Promise.all([
      fetchTmdbMovieCandidates(seedTmdbId, 'recommendations'),
      fetchTmdbMovieCandidates(seedTmdbId, 'similar'),
    ])

    recommendations.results.forEach((candidate) => mergeCandidate(rawCandidates, candidate, seedTmdbId))
    similar.results.forEach((candidate) => mergeCandidate(rawCandidates, candidate, seedTmdbId))
  }

  const genreIds = highAffinityGenreIds(profile)
  if (!options.seedTmdbId && genreIds.length > 0) {
    const discover = await discoverTmdbMovies(genreIds)
    discover.results.forEach((candidate) => mergeCandidate(rawCandidates, candidate, null))
  }

  if (options.includeWatched) {
    films
      .filter((film) => (film.rating ?? 0) >= Math.max(config.ratingStrongPositiveThreshold, RECOMMENDATION_TUNING.rewatchRatingThreshold))
      .forEach((film) => {
        const tmdb = getFilmTmdb(film)
        if (!tmdb) return
        mergeCandidate(rawCandidates, {
          id: tmdb.id,
          title: tmdb.title ?? film.title,
          releaseDate: tmdb.releaseYear ? `${tmdb.releaseYear}-01-01` : null,
          posterPath: tmdb.posterPath,
          posterUrl: tmdb.posterUrl,
          genreIds: [],
          popularity: tmdb.popularity ?? null,
          voteAverage: tmdb.voteAverage ?? null,
          voteCount: null,
          source: 'similar',
        }, tmdb.id)
      })
  }

  const shrunkOf = (c: { voteAverage: number | null; voteCount: number | null }) =>
    bayesianRating(c.voteAverage, c.voteCount, config) ?? 0

  const maxEnriched = options.maxEnrichedCandidates ?? RECOMMENDATION_TUNING.maxEnrichedCandidates
  const headroom = Math.ceil(maxEnriched * 1.5)

  const prefiltered = [...rawCandidates.values()]
    .filter((candidate) => options.includeWatched || !watchedByTmdbId.has(candidate.id))
    .filter((candidate) =>
      options.includeWatched || (candidate.voteCount ?? 0) >= config.minVoteCount,
    )
    .sort((left, right) =>
      shrunkOf(right) - shrunkOf(left) ||
      right.sourceSeedIds.length - left.sourceSeedIds.length ||
      (right.popularity ?? 0) - (left.popularity ?? 0),
    )
    .slice(0, headroom)

  const enriched: RecommendationCandidate[] = []
  for (const candidate of prefiltered) {
    const next = await enrichCandidate(candidate, watchedByTmdbId)
    if (next) enriched.push(next)
  }

  const filtered = enriched.filter((candidate) =>
    options.includeWatched ||
    candidate.runtime === null ||
    candidate.runtime >= config.minRuntimeMinutes,
  )

  return filtered
    .map((candidate) => scoreCandidate(candidate, profile, films, config))
    .sort((left, right) => right.finalScore - left.finalScore)
    .slice(0, maxEnriched)
}
