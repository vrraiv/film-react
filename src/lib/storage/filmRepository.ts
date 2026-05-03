import type {
  FilmEntry,
  FilmSource,
  FilmMetadata,
  OwnedMediaFormat,
  TmdbMatchStatus,
  WatchContext,
} from '../../types/film'
import { appConfig } from '../../config/env'

const STORAGE_KEY = `${appConfig.storageKeyPrefix}.films`

const watchContexts = new Set([
  'theatre',
  'home',
  'airplane',
  'friend-family-home',
  'other',
])

const ownedMediaFormats = new Set(['4k-uhd', 'blu-ray', 'dvd', 'vhs'])

const defaultMetadata = (): FilmMetadata => ({
  dateLogged: '',
  firstWatch: null,
  watchContext: '',
  watchContextNote: '',
  ownedFormats: [],
  onWishlist: false,
  tmdb: null,
})

const isOwnedMediaFormat = (value: unknown): value is OwnedMediaFormat =>
  typeof value === 'string' && ownedMediaFormats.has(value)

const isWatchContext = (value: unknown): value is WatchContext =>
  typeof value === 'string' && watchContexts.has(value)

const isFilmSource = (value: unknown): value is FilmSource =>
  value === 'letterboxd'

const isTmdbMatchStatus = (value: unknown): value is TmdbMatchStatus =>
  typeof value === 'string' &&
  ['not_attempted', 'matched', 'needs_review', 'no_match'].includes(value)

const parseStringArray = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : undefined

const parseMetadata = (value: unknown, legacyContext?: unknown): FilmMetadata => {
  if (!value || typeof value !== 'object') {
    return {
      ...defaultMetadata(),
      watchContextNote:
        typeof legacyContext === 'string' ? legacyContext.trim() : '',
    }
  }

  const record = value as Record<string, unknown>

  const legacyTags = parseStringArray(record.legacyTags)
  const sourceUrl =
    typeof record.sourceUrl === 'string' ? record.sourceUrl : undefined

  return {
    dateLogged: typeof record.dateLogged === 'string' ? record.dateLogged : '',
    firstWatch: typeof record.firstWatch === 'boolean' ? record.firstWatch : null,
    watchContext: isWatchContext(record.watchContext) ? record.watchContext : '',
    watchContextNote:
      typeof record.watchContextNote === 'string'
        ? record.watchContextNote
        : typeof legacyContext === 'string'
          ? legacyContext.trim()
          : '',
    ownedFormats: Array.isArray(record.ownedFormats)
      ? record.ownedFormats.filter(isOwnedMediaFormat)
      : [],
    onWishlist: typeof record.onWishlist === 'boolean' ? record.onWishlist : false,
    tmdb: record.tmdb && typeof record.tmdb === 'object' ? {
      id: typeof (record.tmdb as Record<string, unknown>).id === 'number' ? ((record.tmdb as Record<string, unknown>).id as number) : 0,
      posterPath: typeof (record.tmdb as Record<string, unknown>).posterPath === 'string' ? (record.tmdb as Record<string, unknown>).posterPath as string : null,
      posterUrl: typeof (record.tmdb as Record<string, unknown>).posterUrl === 'string' ? (record.tmdb as Record<string, unknown>).posterUrl as string : null,
      director: typeof (record.tmdb as Record<string, unknown>).director === 'string' ? (record.tmdb as Record<string, unknown>).director as string : null,
      runtime: typeof (record.tmdb as Record<string, unknown>).runtime === 'number' ? (record.tmdb as Record<string, unknown>).runtime as number : null,
      genres: Array.isArray((record.tmdb as Record<string, unknown>).genres) ? ((record.tmdb as Record<string, unknown>).genres as unknown[]).filter((item): item is string => typeof item === "string") : [],
      cast: Array.isArray((record.tmdb as Record<string, unknown>).cast) ? ((record.tmdb as Record<string, unknown>).cast as unknown[]).filter((item): item is string => typeof item === "string") : [],
    } : null,
    ...(isFilmSource(record.source) ? { source: record.source } : {}),
    ...(sourceUrl !== undefined ? { sourceUrl } : {}),
    ...(legacyTags !== undefined ? { legacyTags } : {}),
    ...(isTmdbMatchStatus(record.tmdbMatchStatus)
      ? { tmdbMatchStatus: record.tmdbMatchStatus }
      : {}),
    tmdbReviewCandidate: null,
  }
}

const sortFilms = (films: FilmEntry[]) =>
  [...films].sort((left, right) =>
    right.dateWatched.localeCompare(left.dateWatched),
  )

const toFilmEntry = (value: unknown): FilmEntry | null => {
  if (!value || typeof value !== 'object') {
    return null
  }

  const record = value as Record<string, unknown>

  if (
    typeof record.id !== 'string' ||
    typeof record.title !== 'string' ||
    typeof record.dateWatched !== 'string' ||
    (record.rating !== null && typeof record.rating !== 'number') ||
    !Array.isArray(record.tags) ||
    !record.tags.every((tag) => typeof tag === 'string') ||
    typeof record.notes !== 'string' ||
    typeof record.isPublic !== 'boolean'
  ) {
    return null
  }

  return {
    id: record.id,
    title: record.title,
    releaseYear:
      typeof record.releaseYear === 'number' && Number.isFinite(record.releaseYear)
        ? record.releaseYear
        : null,
    dateWatched: record.dateWatched,
    rating: typeof record.rating === 'number' ? record.rating : null,
    tags: record.tags,
    metadata: parseMetadata(record.metadata, record.context),
    notes: record.notes,
    isPublic: record.isPublic,
  }
}

export const parseFilmEntriesFromJson = (raw: string): FilmEntry[] => {
  const parsed = JSON.parse(raw) as unknown

  if (!Array.isArray(parsed)) {
    throw new Error('JSON must be an array of film entries.')
  }

  const nextFilms = parsed
    .map((entry) => toFilmEntry(entry))
    .filter((entry): entry is FilmEntry => entry !== null)

  if (nextFilms.length !== parsed.length) {
    throw new Error('One or more entries are invalid.')
  }

  return sortFilms(nextFilms)
}

export const loadLegacyLocalFilmEntries = async (): Promise<FilmEntry[]> => {
  const raw = window.localStorage.getItem(STORAGE_KEY)

  if (!raw) {
    return []
  }

  try {
    return parseFilmEntriesFromJson(raw)
  } catch {
    return []
  }
}
