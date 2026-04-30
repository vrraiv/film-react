import type {
  FilmEntry,
  FilmMetadata,
  OwnedMediaFormat,
  WatchContext,
} from '../../types/film'
import { appConfig } from '../../config/env'

export interface FilmRepository {
  loadFilms: () => Promise<FilmEntry[]>
  saveFilms: (films: FilmEntry[]) => Promise<void>
}

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
})

const isOwnedMediaFormat = (value: unknown): value is OwnedMediaFormat =>
  typeof value === 'string' && ownedMediaFormats.has(value)

const isWatchContext = (value: unknown): value is WatchContext =>
  typeof value === 'string' && watchContexts.has(value)

const parseMetadata = (value: unknown, legacyContext?: unknown): FilmMetadata => {
  if (!value || typeof value !== 'object') {
    return {
      ...defaultMetadata(),
      watchContextNote:
        typeof legacyContext === 'string' ? legacyContext.trim() : '',
    }
  }

  const record = value as Record<string, unknown>

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

class LocalFilmRepository implements FilmRepository {
  async loadFilms() {
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

  async saveFilms(films: FilmEntry[]) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sortFilms(films)))
  }
}

export const localFilmRepository: FilmRepository = new LocalFilmRepository()
