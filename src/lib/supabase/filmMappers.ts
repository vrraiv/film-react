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
    tmdb: {
      id: number
      posterPath: string | null
      posterUrl: string | null
      director: string | null
      runtime: number | null
      genres: string[]
      cast: string[]
    } | null
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
    ...row.metadata,
  },
})
