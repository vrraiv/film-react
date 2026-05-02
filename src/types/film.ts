import type { NormalizedMovieMetadata } from '../services/tmdb'

export type WatchContext =
  | 'theatre'
  | 'home'
  | 'airplane'
  | 'friend-family-home'
  | 'other'

export type OwnedMediaFormat = '4k-uhd' | 'blu-ray' | 'dvd' | 'vhs'

export type FilmMetadata = {
  dateLogged: string
  firstWatch: boolean | null
  watchContext: WatchContext | ''
  watchContextNote: string
  ownedFormats: OwnedMediaFormat[]
  onWishlist: boolean
}

export type FilmEntry = {
  id: string
  title: string
  releaseYear: number | null
  dateWatched: string
  rating: number | null
  tags: string[]
  metadata: FilmMetadata
  notes: string
  isPublic: boolean
  tmdbId?: number
  tmdbMetadata?: NormalizedMovieMetadata
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
  tmdbId?: number
  tmdbMetadata?: NormalizedMovieMetadata
}
