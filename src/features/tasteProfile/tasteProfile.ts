import type { FilmEntry } from '../../types/film'

export type RatingDistributionBucket = {
  rating: number
  count: number
  share: number
}

export type BaselineRatingStats = {
  ratedCount: number
  averageRating: number | null
  distribution: RatingDistributionBucket[]
}

export type RuntimeBucket = 'short' | 'feature' | 'long' | 'epic'

export type TasteFeatureType =
  | 'manual_tag'
  | 'tmdb_genre'
  | 'tmdb_keyword'
  | 'director'
  | 'decade'
  | 'country'
  | 'language'
  | 'runtime_bucket'

export type TasteFeatureOccurrence = {
  type: TasteFeatureType
  key: string
}

export type FeatureClassification =
  | 'safe_bet_zone'
  | 'high_interest_mixed_results'
  | 'underexplored_high_upside'
  | 'low_priority'
  | 'neutral_or_insufficient_data'
  | 'possible_avoid'

export type FeatureStats = {
  feature: TasteFeatureOccurrence
  count: number
  watchedPrevalence: number
  ratedCount: number
  averageRating: number | null
  hitRateAtLeast4: number | null
  hitRateAtLeast45: number | null
  affinityScore: number
  expectedSatisfactionScore: number
  residualMean: number | null
  residualVariance: number | null
  riskScore: number
  confidenceScore: number
  classification: FeatureClassification
  metadataCompleteness: number
}

export type TasteProfile = {
  baseline: BaselineRatingStats
  totalFilms: number
  features: FeatureStats[]
}

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v))

const makeRuntimeBucket = (runtime: number): RuntimeBucket => {
  if (runtime < 90) return 'short'
  if (runtime < 121) return 'feature'
  if (runtime < 151) return 'long'
  return 'epic'
}

export const calculateBaselineRatingStats = (films: FilmEntry[]): BaselineRatingStats => {
  const ratings = films.map((film) => film.rating).filter((rating): rating is number => rating !== null)
  const ratedCount = ratings.length
  const averageRating = ratedCount === 0 ? null : ratings.reduce((sum, rating) => sum + rating, 0) / ratedCount

  const distributionMap = new Map<number, number>()
  for (const rating of ratings) {
    distributionMap.set(rating, (distributionMap.get(rating) ?? 0) + 1)
  }

  const distribution = [...distributionMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([rating, count]) => ({ rating, count, share: count / ratedCount }))

  return { ratedCount, averageRating, distribution }
}

export const extractFilmFeatures = (film: FilmEntry): TasteFeatureOccurrence[] => {
  const unique = new Set<string>()
  const features: TasteFeatureOccurrence[] = []
  const add = (type: TasteFeatureType, key: string | null | undefined) => {
    if (!key) return
    const clean = key.trim().toLowerCase()
    if (!clean) return
    const id = `${type}:${clean}`
    if (unique.has(id)) return
    unique.add(id)
    features.push({ type, key: clean })
  }

  film.tags.forEach((tag) => add('manual_tag', tag))
  film.metadata.tmdb?.genres.forEach((genre) => add('tmdb_genre', genre))
  film.metadata.keywords?.forEach((keyword) => add('tmdb_keyword', keyword.value))
  add('director', film.metadata.tmdb?.director)

  const year = film.releaseYear ?? film.metadata.tmdb?.releaseYear ?? null
  if (year !== null) add('decade', `${Math.floor(year / 10) * 10}s`)

  // optional metadata fields are checked defensively for forward compatibility.
  const maybeCountry = (film.metadata.tmdb as unknown as { countries?: string[] } | null)?.countries
  maybeCountry?.forEach((country) => add('country', country))

  const maybeLanguage = (film.metadata.tmdb as unknown as { languages?: string[] } | null)?.languages
  maybeLanguage?.forEach((language) => add('language', language))

  if (film.metadata.tmdb?.runtime !== null && film.metadata.tmdb?.runtime !== undefined) {
    add('runtime_bucket', makeRuntimeBucket(film.metadata.tmdb.runtime))
  }

  return features
}

type Aggregate = {
  count: number
  ratings: number[]
  residuals: number[]
  metadataHits: number
}

export const buildTasteProfile = (films: FilmEntry[]): TasteProfile => {
  const baseline = calculateBaselineRatingStats(films)
  const globalAverage = baseline.averageRating ?? 3.5
  const totalFilms = films.length

  const aggregateByFeature = new Map<string, { feature: TasteFeatureOccurrence; agg: Aggregate }>()

  for (const film of films) {
    const features = extractFilmFeatures(film)
    const metadataPotential = 7
    const metadataHits = new Set(features.map((f) => f.type)).size

    for (const feature of features) {
      const mapKey = `${feature.type}:${feature.key}`
      const entry = aggregateByFeature.get(mapKey) ?? {
        feature,
        agg: { count: 0, ratings: [], residuals: [], metadataHits: 0 },
      }
      entry.agg.count += 1
      entry.agg.metadataHits += metadataHits / metadataPotential
      if (film.rating !== null) {
        entry.agg.ratings.push(film.rating)
        entry.agg.residuals.push(film.rating - globalAverage)
      }
      aggregateByFeature.set(mapKey, entry)
    }
  }

  const features = [...aggregateByFeature.values()].map(({ feature, agg }): FeatureStats => {
    const ratedCount = agg.ratings.length
    const averageRating = ratedCount > 0 ? agg.ratings.reduce((s, r) => s + r, 0) / ratedCount : null
    const hitRateAtLeast4 = ratedCount > 0 ? agg.ratings.filter((r) => r >= 4).length / ratedCount : null
    const hitRateAtLeast45 = ratedCount > 0 ? agg.ratings.filter((r) => r >= 4.5).length / ratedCount : null
    const watchedPrevalence = totalFilms === 0 ? 0 : agg.count / totalFilms

    const affinityScore = clamp01(Math.pow(watchedPrevalence, 0.65))

    const priorMean = globalAverage
    const priorWeight = 4
    const expectedSatisfactionScore = clamp01((((averageRating ?? priorMean) * ratedCount + priorMean * priorWeight) / (ratedCount + priorWeight)) / 5)

    const residualMean = ratedCount > 0 ? agg.residuals.reduce((s, r) => s + r, 0) / ratedCount : null
    const residualVariance = ratedCount > 1
      ? agg.residuals.reduce((s, r) => s + (r - (residualMean ?? 0)) ** 2, 0) / ratedCount
      : null

    const varianceRisk = clamp01((residualVariance ?? 0) / 1.2)
    const mixedResultRisk = hitRateAtLeast45 !== null && hitRateAtLeast4 !== null
      ? clamp01((hitRateAtLeast4 - hitRateAtLeast45) * 1.6)
      : 0
    const riskScore = clamp01(varianceRisk * 0.6 + mixedResultRisk * 0.4)

    const sampleConfidence = clamp01(Math.log10(ratedCount + 1) / Math.log10(21))
    const metadataCompleteness = clamp01(agg.metadataHits / Math.max(agg.count, 1))
    const confidenceScore = clamp01(sampleConfidence * 0.75 + metadataCompleteness * 0.25)

    const classification = classifyFeature({
      feature,
      count: agg.count,
      ratedCount,
      affinityScore,
      expectedSatisfactionScore,
      riskScore,
      confidenceScore,
      hitRateAtLeast4,
      hitRateAtLeast45,
      averageRating,
    })

    return {
      feature,
      count: agg.count,
      watchedPrevalence,
      ratedCount,
      averageRating,
      hitRateAtLeast4,
      hitRateAtLeast45,
      affinityScore,
      expectedSatisfactionScore,
      residualMean,
      residualVariance,
      riskScore,
      confidenceScore,
      classification,
      metadataCompleteness,
    }
  })

  return {
    baseline,
    totalFilms,
    features: features.sort((a, b) => b.affinityScore - a.affinityScore || b.count - a.count),
  }
}

const classifyFeature = (input: {
  feature: TasteFeatureOccurrence
  count: number
  ratedCount: number
  affinityScore: number
  expectedSatisfactionScore: number
  riskScore: number
  confidenceScore: number
  hitRateAtLeast4: number | null
  hitRateAtLeast45: number | null
  averageRating: number | null
}): FeatureClassification => {
  const { feature, count, ratedCount, affinityScore, expectedSatisfactionScore, riskScore, confidenceScore, averageRating } = input

  if (ratedCount < 2 || confidenceScore < 0.25) return 'neutral_or_insufficient_data'
  if (affinityScore >= 0.55 && expectedSatisfactionScore >= 0.78 && riskScore < 0.42) return 'safe_bet_zone'
  if (affinityScore >= 0.55 && riskScore >= 0.42) return 'high_interest_mixed_results'
  if (count <= 4 && expectedSatisfactionScore >= 0.76 && confidenceScore >= 0.3) return 'underexplored_high_upside'
  if (affinityScore < 0.2 && expectedSatisfactionScore < 0.62) return 'low_priority'

  const selectionAffinityTypes: TasteFeatureType[] = ['tmdb_genre', 'director', 'country', 'language', 'decade', 'runtime_bucket', 'tmdb_keyword']
  const isSelectionAffinity = selectionAffinityTypes.includes(feature.type)
  if (!isSelectionAffinity && ratedCount >= 6 && (averageRating ?? 5) <= 2.7) return 'possible_avoid'

  return 'neutral_or_insufficient_data'
}
