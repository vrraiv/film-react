import type { FilmEntry, OwnedMediaFormat, WatchContext } from '../../types/film'

export type FilmEntryRow = {
  id: string
  user_id: string
  title: string
  release_year: number | null
  date_watched: string
  rating: number | null
  tags: string[]
  notes: string
  is_public: boolean
  metadata: {
    dateLogged: string
    firstWatch: boolean | null
    watchContext: WatchContext | ''
    watchContextNote: string
    ownedFormats: OwnedMediaFormat[]
    onWishlist: boolean
    tmdbId?: number
    tmdbMetadata?: FilmEntry['tmdbMetadata']
  }
}

export const mapFilmEntryToRow = (film: FilmEntry, userId: string): FilmEntryRow => ({
  id: film.id,
  user_id: userId,
  title: film.title,
  release_year: film.releaseYear,
  date_watched: film.dateWatched,
  rating: film.rating,
  tags: film.tags,
  notes: film.notes,
  is_public: film.isPublic,
  metadata: {
    ...film.metadata,
    tmdbId: film.tmdbId,
    tmdbMetadata: film.tmdbMetadata,
  },
})

export const mapRowToFilmEntry = (row: FilmEntryRow): FilmEntry => ({
  id: row.id,
  title: row.title,
  releaseYear: row.release_year,
  dateWatched: row.date_watched,
  rating: row.rating,
  tags: row.tags,
  notes: row.notes,
  isPublic: row.is_public,
  metadata: {
    dateLogged: row.metadata?.dateLogged ?? "",
    firstWatch: row.metadata?.firstWatch ?? null,
    watchContext: row.metadata?.watchContext ?? "",
    watchContextNote: row.metadata?.watchContextNote ?? "",
    ownedFormats: row.metadata?.ownedFormats ?? [],
    onWishlist: row.metadata?.onWishlist ?? false,
  },
  tmdbId: row.metadata?.tmdbId,
  tmdbMetadata: row.metadata?.tmdbMetadata,
})
