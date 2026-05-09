import type { TasteFeatureOccurrence, TasteFeatureType } from '../tasteProfile/tasteProfile'

export type RecommenderFeatureOverride =
  | 'seek'
  | 'like_when_done_well'
  | 'neutral'
  | 'avoid'
  | 'ignore'

export type RecommenderFeatureWeights = Record<TasteFeatureType, number>

export type RecommenderConfig = {
  minimumFeatureCount: number
  ratingPositiveThreshold: number
  ratingStrongPositiveThreshold: number
  maxNegativePenaltyForSelectionFeatures: number
  featureWeights: RecommenderFeatureWeights
  tmdbPopularityPriorWeight: number
  minVoteCount: number
  minRuntimeMinutes: number
  voteShrinkagePrior: number
  voteShrinkageMean: number
  featureOverrides: Record<string, RecommenderFeatureOverride>
}

export const DEFAULT_RECOMMENDER_CONFIG: RecommenderConfig = {
  minimumFeatureCount: 2,
  ratingPositiveThreshold: 4,
  ratingStrongPositiveThreshold: 4.5,
  maxNegativePenaltyForSelectionFeatures: 0.18,
  featureWeights: {
    manual_tag: 1.2,
    tmdb_keyword: 0.72,
    director: 1.08,
    tmdb_genre: 0.92,
    decade: 0.42,
    country: 0.45,
    language: 0.35,
    runtime_bucket: 0.32,
  },
  tmdbPopularityPriorWeight: 0.28,
  minVoteCount: 25,
  minRuntimeMinutes: 40,
  voteShrinkagePrior: 50,
  voteShrinkageMean: 6.5,
  featureOverrides: {},
}

export const FEATURE_OVERRIDE_LABELS: Record<RecommenderFeatureOverride, string> = {
  seek: 'Seek',
  like_when_done_well: 'Like when done well',
  neutral: 'Neutral',
  avoid: 'Avoid',
  ignore: 'Ignore',
}

export const featureOverrideOptions: RecommenderFeatureOverride[] = [
  'seek',
  'like_when_done_well',
  'neutral',
  'avoid',
  'ignore',
]

export const makeFeatureOverrideKey = (feature: TasteFeatureOccurrence) =>
  `${feature.type}:${feature.key.trim().toLowerCase()}`

export const mergeRecommenderConfig = (
  override: Partial<RecommenderConfig> | null | undefined,
): RecommenderConfig => ({
  ...DEFAULT_RECOMMENDER_CONFIG,
  ...override,
  featureWeights: {
    ...DEFAULT_RECOMMENDER_CONFIG.featureWeights,
    ...override?.featureWeights,
  },
  featureOverrides: {
    ...DEFAULT_RECOMMENDER_CONFIG.featureOverrides,
    ...override?.featureOverrides,
  },
})

export const getFeatureOverride = (
  feature: TasteFeatureOccurrence,
  config: RecommenderConfig,
) => config.featureOverrides[makeFeatureOverrideKey(feature)] ?? null

export const isSelectionFeature = (type: TasteFeatureType) =>
  ['tmdb_genre', 'director', 'country', 'language', 'decade', 'runtime_bucket', 'tmdb_keyword'].includes(type)
