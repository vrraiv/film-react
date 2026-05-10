export type WatchContext =
  | 'theatre'
  | 'home'
  | 'airplane'
  | 'friend-family-home'
  | 'other'

export type OwnedMediaFormat = '4k-uhd' | 'blu-ray' | 'dvd' | 'vhs'

export type FilmTmdbMetadata = {
  id: number
  title?: string
  releaseDate?: string | null
  releaseYear?: number | null
  posterPath: string | null
  posterUrl: string | null
  director: string | null
  writers?: string[]
  runtime: number | null
  popularity?: number | null
  voteAverage?: number | null
  genres: string[]
  cast: string[]
  countries?: string[]
  languages?: string[]
  keywords?: string[]
}

export type FilmMetadataKeyword = {
  source: 'tmdb'
  value: string
}

export type FilmSource = 'letterboxd'

export type TmdbMatchStatus =
  | 'not_attempted'
  | 'matched'
  | 'needs_review'
  | 'no_match'

export type FilmMetadata = {
  dateLogged: string
  firstWatch: boolean | null
  watchContext: WatchContext | ''
  watchContextNote: string
  ownedFormats: OwnedMediaFormat[]
  onWishlist: boolean
  tmdb: FilmTmdbMetadata | null
  source?: FilmSource
  sourceUrl?: string
  legacyTags?: string[]
  tmdbMatchStatus?: TmdbMatchStatus
  tmdbReviewCandidate?: FilmTmdbMetadata | null
  tmdbReviewReason?: string
  keywords?: FilmMetadataKeyword[]
}

export type FilmEntry = {
  id: string
  title: string
  releaseYear: number | null
  dateWatched: string
  rating: number | null
  tags: string[]
  metadata: FilmMetadata
  tmdbMetadata?: FilmTmdbMetadata | null
  notes: string
  isPublic: boolean
}

export type CreateFilmEntryInput = {
  title: string
  releaseYear?: number | null
  dateWatched: string
  rating: number | null
  notes: string
  tags?: string[]
  metadata?: Partial<FilmMetadata>
  isPublic?: boolean
}
