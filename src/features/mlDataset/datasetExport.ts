import {
  buildTasteProfile,
  extractFilmFeatures,
  type FeatureStats,
  type TasteFeatureOccurrence,
} from '../tasteProfile/tasteProfile'
import { DEFAULT_RECOMMENDER_CONFIG, type RecommenderConfig } from '../recommendations/recommenderConfig'
import type { FilmRecommendation } from '../recommendations/recommender'
import type { FilmEntry, FilmTmdbMetadata } from '../../types/film'

export type MlDatasetRowKind = 'logged' | 'candidate'
export type MlDatasetSplit = 'train' | 'validation' | 'unwatched_pool'
export type MlDatasetLabelType = 'observed_rating' | 'unknown_unwatched_candidate'

export type MlFeatureSnapshot = {
  key: string
  type: TasteFeatureOccurrence['type']
  count: number
  classification: FeatureStats['classification']
  affinityScore: number
  expectedSatisfactionScore: number
  riskScore: number
  confidenceScore: number
  residualMean: number | null
  residualVariance: number | null
}

export type MlDatasetRow = {
  rowKind: MlDatasetRowKind
  split: MlDatasetSplit
  labelType: MlDatasetLabelType
  movieId: string | null
  tmdbId: number | null
  title: string
  rating: number | null
  watchedDate: string | null
  watched: boolean
  labels: {
    ratingAtLeast4: boolean | null
    ratingAtLeast45: boolean | null
    normalizedRating: number | null
    watched: boolean
    sampledNegativeOrUnknown: boolean
  }
  manualTags: string[]
  tmdbGenres: string[]
  tmdbKeywords: string[]
  director: string | null
  writers: string[]
  cast: string[]
  runtime: number | null
  year: number | null
  countries: string[]
  languages: string[]
  v1Scores: {
    interestScore: number
    satisfactionScore: number
    riskScore: number
    confidenceScore: number
  }
  featureClassifications: MlFeatureSnapshot[]
  candidateMetadata: {
    recommendationType: FilmRecommendation['recommendationType'] | null
    finalScore: number | null
    candidateSources: string[]
    sourceSeedTmdbIds: number[]
  }
}

export type MlDatasetExport = {
  exportVersion: 'ml-dataset-v1'
  config: {
    ratingPositiveThreshold: number
    ratingStrongPositiveThreshold: number
    validationFraction: number
  }
  summary: {
    loggedRows: number
    candidateRows: number
    trainRows: number
    validationRows: number
  }
  rows: MlDatasetRow[]
}

export type BuildMlDatasetOptions = {
  candidates?: FilmRecommendation[]
  config?: RecommenderConfig
  validationFraction?: number
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value))

const featureMapKey = (feature: TasteFeatureOccurrence) => `${feature.type}:${feature.key}`

const getTmdb = (film: FilmEntry): FilmTmdbMetadata | null => film.metadata.tmdb ?? film.tmdbMetadata ?? null

const getTmdbKeywords = (film: FilmEntry) =>
  (film.metadata.keywords ?? [])
    .filter((keyword) => keyword.source === 'tmdb')
    .map((keyword) => keyword.value)

const getOptionalStringArray = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []

const scoreFromFeatures = (features: FeatureStats[]) => {
  if (features.length === 0) {
    return {
      interestScore: 0,
      satisfactionScore: 0,
      riskScore: 0,
      confidenceScore: 0,
    }
  }

  const weighted = features.reduce((acc, feature) => {
    const weight = Math.max(feature.confidenceScore, 0.12) * Math.max(feature.affinityScore, 0.12)
    return {
      interest: acc.interest + feature.affinityScore * weight,
      satisfaction: acc.satisfaction + feature.expectedSatisfactionScore * weight,
      risk: acc.risk + feature.riskScore * weight,
      confidence: acc.confidence + feature.confidenceScore * weight,
      weight: acc.weight + weight,
    }
  }, { interest: 0, satisfaction: 0, risk: 0, confidence: 0, weight: 0 })

  return {
    interestScore: clamp01(weighted.interest / weighted.weight),
    satisfactionScore: clamp01(weighted.satisfaction / weighted.weight),
    riskScore: clamp01(weighted.risk / weighted.weight),
    confidenceScore: clamp01(weighted.confidence / weighted.weight),
  }
}

const snapshotFeatures = (features: FeatureStats[]): MlFeatureSnapshot[] =>
  features.map((feature) => ({
    key: feature.feature.key,
    type: feature.feature.type,
    count: feature.count,
    classification: feature.classification,
    affinityScore: feature.affinityScore,
    expectedSatisfactionScore: feature.expectedSatisfactionScore,
    riskScore: feature.riskScore,
    confidenceScore: feature.confidenceScore,
    residualMean: feature.residualMean,
    residualVariance: feature.residualVariance,
  }))

const buildLoggedRows = (
  films: FilmEntry[],
  profileFeaturesByKey: Map<string, FeatureStats>,
  config: RecommenderConfig,
  validationFraction: number,
): MlDatasetRow[] => {
  const watchedSorted = [...films].sort((left, right) =>
    left.dateWatched.localeCompare(right.dateWatched) || left.id.localeCompare(right.id),
  )
  const validationCount = Math.max(1, Math.round(watchedSorted.length * validationFraction))
  const validationStart = Math.max(0, watchedSorted.length - validationCount)

  return watchedSorted.map((film, index) => {
    const tmdb = getTmdb(film)
    const features = extractFilmFeatures(film)
      .map((feature) => profileFeaturesByKey.get(featureMapKey(feature)))
      .filter((feature): feature is FeatureStats => Boolean(feature))
    const scores = scoreFromFeatures(features)
    const rating = film.rating
    const metadataRecord = tmdb as unknown as Record<string, unknown> | null

    return {
      rowKind: 'logged',
      split: index >= validationStart ? 'validation' : 'train',
      labelType: 'observed_rating',
      movieId: film.id,
      tmdbId: tmdb?.id ?? null,
      title: film.title,
      rating,
      watchedDate: film.dateWatched || null,
      watched: true,
      labels: {
        ratingAtLeast4: rating === null ? null : rating >= config.ratingPositiveThreshold,
        ratingAtLeast45: rating === null ? null : rating >= config.ratingStrongPositiveThreshold,
        normalizedRating: rating === null ? null : rating / 5,
        watched: true,
        sampledNegativeOrUnknown: false,
      },
      manualTags: film.tags,
      tmdbGenres: tmdb?.genres ?? [],
      tmdbKeywords: getTmdbKeywords(film),
      director: tmdb?.director ?? null,
      writers: tmdb?.writers ?? getOptionalStringArray(metadataRecord?.writers),
      cast: tmdb?.cast ?? [],
      runtime: tmdb?.runtime ?? null,
      year: film.releaseYear ?? tmdb?.releaseYear ?? null,
      countries: tmdb?.countries ?? getOptionalStringArray(metadataRecord?.countries),
      languages: tmdb?.languages ?? getOptionalStringArray(metadataRecord?.languages),
      v1Scores: scores,
      featureClassifications: snapshotFeatures(features),
      candidateMetadata: {
        recommendationType: null,
        finalScore: null,
        candidateSources: [],
        sourceSeedTmdbIds: [],
      },
    }
  })
}

const buildCandidateRows = (candidates: FilmRecommendation[] = []): MlDatasetRow[] =>
  [...candidates]
    .sort((left, right) =>
      right.finalScore - left.finalScore ||
      left.title.localeCompare(right.title) ||
      left.tmdbId - right.tmdbId,
    )
    .map((candidate) => ({
      rowKind: 'candidate',
      split: 'unwatched_pool',
      labelType: 'unknown_unwatched_candidate',
      movieId: null,
      tmdbId: candidate.tmdbId,
      title: candidate.title,
      rating: null,
      watchedDate: null,
      watched: false,
      labels: {
        ratingAtLeast4: null,
        ratingAtLeast45: null,
        normalizedRating: null,
        watched: false,
        sampledNegativeOrUnknown: true,
      },
      manualTags: [],
      tmdbGenres: candidate.genres,
      tmdbKeywords: candidate.keywords,
      director: candidate.director,
      writers: candidate.writers,
      cast: candidate.cast,
      runtime: candidate.runtime,
      year: candidate.year,
      countries: candidate.countries,
      languages: candidate.languages,
      v1Scores: {
        interestScore: candidate.interestScore,
        satisfactionScore: candidate.expectedSatisfactionScore,
        riskScore: candidate.riskScore,
        confidenceScore: candidate.confidenceScore,
      },
      featureClassifications: [],
      candidateMetadata: {
        recommendationType: candidate.recommendationType,
        finalScore: candidate.finalScore,
        candidateSources: candidate.sources,
        sourceSeedTmdbIds: candidate.sourceSeedIds,
      },
    }))

export const buildMlDatasetExport = (
  films: FilmEntry[],
  options: BuildMlDatasetOptions = {},
): MlDatasetExport => {
  const config = options.config ?? DEFAULT_RECOMMENDER_CONFIG
  const validationFraction = options.validationFraction ?? 0.2
  const profile = buildTasteProfile(films, config)
  const profileFeaturesByKey = new Map(profile.features.map((feature) => [featureMapKey(feature.feature), feature]))
  const loggedRows = buildLoggedRows(films, profileFeaturesByKey, config, validationFraction)
  const candidateRows = buildCandidateRows(options.candidates)
  const rows = [...loggedRows, ...candidateRows]

  return {
    exportVersion: 'ml-dataset-v1',
    config: {
      ratingPositiveThreshold: config.ratingPositiveThreshold,
      ratingStrongPositiveThreshold: config.ratingStrongPositiveThreshold,
      validationFraction,
    },
    summary: {
      loggedRows: loggedRows.length,
      candidateRows: candidateRows.length,
      trainRows: loggedRows.filter((row) => row.split === 'train').length,
      validationRows: loggedRows.filter((row) => row.split === 'validation').length,
    },
    rows,
  }
}

export const serializeMlDatasetExport = (dataset: MlDatasetExport) =>
  `${JSON.stringify(dataset, null, 2)}\n`
