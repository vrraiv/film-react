import {
  DEFAULT_RECOMMENDER_CONFIG,
  mergeRecommenderConfig,
  type RecommenderConfig,
} from './recommenderConfig'

const STORAGE_KEY = 'filmDiary.recommenderConfig.v1'

export const loadStoredRecommenderConfig = (): RecommenderConfig => {
  if (typeof localStorage === 'undefined') return DEFAULT_RECOMMENDER_CONFIG

  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return DEFAULT_RECOMMENDER_CONFIG

  try {
    return mergeRecommenderConfig(JSON.parse(raw) as Partial<RecommenderConfig>)
  } catch {
    return DEFAULT_RECOMMENDER_CONFIG
  }
}

export const saveStoredRecommenderConfig = (config: RecommenderConfig) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

export const clearStoredRecommenderConfig = () => {
  localStorage.removeItem(STORAGE_KEY)
}
