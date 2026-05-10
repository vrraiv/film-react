import type {
  FilmEntry,
  FilmMetadataKeyword,
  FilmSource,
  OwnedMediaFormat,
  TmdbMatchStatus,
  WatchContext,
} from '../../types/film'

export type FilmEntryRow = {
  id: string
  user_id: string
  title: string
  release_year: number | null
  release_date: string | null
  date_watched: string | null
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
      title?: string
      releaseDate?: string | null
      releaseYear?: number | null
      posterPath: string | null
      posterUrl: string | null
      director: string | null
      writers?: string[]
      runtime: number | null
      genres: string[]
      cast: string[]
      countries?: string[]
      languages?: string[]
    } | null
    source?: FilmSource
    sourceUrl?: string
    legacyTags?: string[]
    tmdbMatchStatus?: TmdbMatchStatus
    tmdbReviewCandidate?: FilmEntry['metadata']['tmdbReviewCandidate']
    tmdbReviewReason?: string
    keywords?: FilmMetadataKeyword[]
  }
}

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/

const getFilmReleaseDate = (film: FilmEntry): string | null => {
  const releaseDate =
    film.metadata.tmdb?.releaseDate ?? film.tmdbMetadata?.releaseDate ?? null

  return typeof releaseDate === 'string' && isoDatePattern.test(releaseDate)
    ? releaseDate
    : null
}

const metadataWithReleaseDate = (
  metadata: FilmEntryRow['metadata'],
  releaseDate: string | null,
): FilmEntryRow['metadata'] => {
  if (!metadata.tmdb) {
    return metadata
  }

  return {
    ...metadata,
    tmdb: {
      ...metadata.tmdb,
      releaseDate: releaseDate ?? metadata.tmdb.releaseDate ?? null,
    },
  }
}

export const mapFilmEntryToRow = (film: FilmEntry, userId: string): FilmEntryRow => ({
  id: film.id,
  user_id: userId,
  title: film.title,
  release_year: film.releaseYear,
  release_date: getFilmReleaseDate(film),
  date_watched: film.dateWatched ? film.dateWatched : null,
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
  dateWatched: row.date_watched ?? '',
  rating: row.rating,
  tags: row.tags,
  notes: row.notes,
  isPublic: row.is_public,
  metadata: metadataWithReleaseDate(row.metadata, row.release_date),
})
