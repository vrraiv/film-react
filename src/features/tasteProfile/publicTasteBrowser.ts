import { formatFilmTag } from '../../config/filmOptions'
import { getTagById } from '../../config/filmTags'
import type { FilmEntry } from '../../types/film'

type RuntimeBucket = 'short' | 'feature' | 'long' | 'epic' | 'unknown'

export type PublicTasteFilters = {
  tagOrMood: string
  runtimeBucket: RuntimeBucket | 'all'
}

export type CuratedFilm = {
  film: FilmEntry
  explanation: string
}

const NOT_FOR_EVERYONE_TAGS = new Set([
  'bleak',
  'slow_cinema',
  'austere',
  'chaotic',
  'dreamlike',
  'menacing',
])

const ratingOrZero = (film: FilmEntry) => film.rating ?? 0

const runtimeBucketForFilm = (film: FilmEntry): RuntimeBucket => {
  const runtime = film.tmdbMetadata?.runtime ?? film.metadata.tmdb?.runtime
  if (typeof runtime !== 'number') return 'unknown'
  if (runtime < 90) return 'short'
  if (runtime < 121) return 'feature'
  if (runtime < 151) return 'long'
  return 'epic'
}

const topTagsByRatedFilms = (films: FilmEntry[], limit = 3): string[] => {
  const counts = new Map<string, number>()
  films.filter((film) => film.rating !== null).forEach((film) => {
    film.tags.forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1))
  })

  return [...counts.entries()]
    .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([tag]) => tag)
}

const buildReason = (film: FilmEntry, emphasis: string) => {
  const topTags = film.tags.slice(0, 3).map((tag) => formatFilmTag(tag)).join(', ')
  const tagText = topTags ? ` Tags: ${topTags}.` : ''
  return `Included because it is ${emphasis}.${tagText}`
}

const sortByRatingThenDate = (films: FilmEntry[]) => [...films].sort((a, b) => {
  const ratingDelta = ratingOrZero(b) - ratingOrZero(a)
  if (ratingDelta !== 0) return ratingDelta
  return b.dateWatched.localeCompare(a.dateWatched)
})

export const buildPublicTasteBrowser = (films: FilmEntry[], filters: PublicTasteFilters) => {
  const watched = films.filter((film) => film.rating !== null)
  const topTags = topTagsByRatedFilms(watched)
  const filtered = watched.filter((film) => {
    if (filters.tagOrMood && !film.tags.includes(filters.tagOrMood)) return false
    if (filters.runtimeBucket !== 'all' && runtimeBucketForFilm(film) !== filters.runtimeBucket) return false
    return true
  })

  const starterPack = sortByRatingThenDate(filtered)
    .filter((film) => (film.rating ?? 0) >= 4)
    .sort((a, b) => {
      const ap = a.tmdbMetadata?.id ?? a.metadata.tmdb?.id ?? Number.MAX_SAFE_INTEGER
      const bp = b.tmdbMetadata?.id ?? b.metadata.tmdb?.id ?? Number.MAX_SAFE_INTEGER
      const ratingDelta = ratingOrZero(b) - ratingOrZero(a)
      if (ratingDelta !== 0) return ratingDelta
      return ap - bp
    })
    .slice(0, 8)
    .map((film) => ({ film, explanation: buildReason(film, 'highly rated and representative of recurring preferences') }))

  const personalCanon = sortByRatingThenDate(filtered)
    .filter((film) => (film.rating ?? 0) >= 4.5)
    .slice(0, 12)
    .map((film) => ({ film, explanation: buildReason(film, 'part of the strongest personal canon by rating') }))

  const bestByMoodOrTag = sortByRatingThenDate(filtered)
    .filter((film) => filters.tagOrMood ? film.tags.includes(filters.tagOrMood) : true)
    .slice(0, 10)
    .map((film) => ({ film, explanation: buildReason(film, 'highly rated and aligned with the selected mood/tag') }))

  const deepCuts = [] as CuratedFilm[]

  const notForEveryone = sortByRatingThenDate(filtered)
    .filter((film) => (film.rating ?? 0) >= 4 && film.tags.some((tag) => NOT_FOR_EVERYONE_TAGS.has(tag)))
    .slice(0, 8)
    .map((film) => ({ film, explanation: buildReason(film, 'highly rated despite challenging tone/style traits') }))

  const relatedByFilm = (selectedFilmId: string): CuratedFilm[] => {
    const seed = watched.find((film) => film.id === selectedFilmId)
    if (!seed) return []

    return sortByRatingThenDate(
      watched.filter((film) => film.id !== seed.id)
        .filter((film) => film.tags.some((tag) => seed.tags.includes(tag))),
    )
      .slice(0, 8)
      .map((film) => {
        const shared = film.tags.filter((tag) => seed.tags.includes(tag)).slice(0, 3)
        const sharedText = shared.map((tag) => formatFilmTag(tag)).join(', ')
        return {
          film,
          explanation: `Included because it overlaps with ${seed.title} on recurring traits: ${sharedText}.`,
        }
      })
  }

  return {
    topTags,
    filtered,
    starterPack,
    personalCanon,
    bestByMoodOrTag,
    deepCuts,
    deepCutsDataAvailable: false,
    notForEveryone,
    relatedByFilm,
    availableTags: [...new Set(watched.flatMap((film) => film.tags))]
      .sort((a, b) => (getTagById(a)?.label ?? a).localeCompare(getTagById(b)?.label ?? b)),
  }
}
