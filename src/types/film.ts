export type WatchContext =
  | 'theatre'
  | 'home'
  | 'airplane'
  | 'friend-family-home'
  | 'other'

export type OwnedMediaFormat = '4k-uhd' | 'blu-ray' | 'dvd' | 'vhs'

export type FilmTmdbMetadata = {
  id: number
  posterPath: string | null
  posterUrl: string | null
  director: string | null
  runtime: number | null
  genres: string[]
  cast: string[]
}

export type FilmMetadata = {
  dateLogged: string
  firstWatch: boolean | null
  watchContext: WatchContext | ''
  watchContextNote: string
  ownedFormats: OwnedMediaFormat[]
  onWishlist: boolean
  tmdb: FilmTmdbMetadata | null
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
