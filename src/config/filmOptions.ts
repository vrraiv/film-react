import { FILM_TAGS, TAG_CATEGORIES, getTagById } from './filmTags'
import type { OwnedMediaFormat, WatchContext } from '../types/film'

export const watchContextOptions: Array<{
  value: WatchContext
  label: string
}> = [
  { value: 'theatre', label: 'Theatre' },
  { value: 'home', label: 'Home' },
  { value: 'airplane', label: 'Airplane' },
  { value: 'friend-family-home', label: "Friend or family's home" },
  { value: 'other', label: 'Other' },
]

export const ownedMediaOptions: Array<{
  value: OwnedMediaFormat
  label: string
}> = [
  { value: '4k-uhd', label: '4K UHD' },
  { value: 'blu-ray', label: 'Blu-ray' },
  { value: 'dvd', label: 'DVD' },
  { value: 'vhs', label: 'VHS' },
]

export const filmTagOptions = FILM_TAGS.map((tag) => ({
  categoryId: tag.category,
  categoryLabel: TAG_CATEGORIES.find((category) => category.id === tag.category)?.label ?? tag.category,
  label: tag.label,
  value: tag.id,
}))

export const filmTagLookup = new Map(
  FILM_TAGS.map((tag) => [tag.id, tag]),
)

const legacyTagIdByNormalizedValue = new Map(
  FILM_TAGS.flatMap((tag) => {
    const normalizedLabel = tag.label.trim().toLowerCase().replace(/\s+/g, '_')
    return [[normalizedLabel, tag.id], [tag.id, tag.id]]
  }),
)

export const normalizeTag = (value: string) => {
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, '_')
  return legacyTagIdByNormalizedValue.get(normalized) ?? ''
}

export const formatWatchContext = (value: WatchContext | '') =>
  watchContextOptions.find((option) => option.value === value)?.label ?? 'Unspecified'

export const formatOwnedMedia = (value: OwnedMediaFormat) =>
  ownedMediaOptions.find((option) => option.value === value)?.label ?? value

export const formatFilmTag = (value: string) =>
  getTagById(value)?.label ?? value
