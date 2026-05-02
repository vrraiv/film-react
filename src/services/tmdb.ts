export type TmdbSearchResult = {
  id: number
  title: string
  release_date: string
  poster_path: string | null
  overview: string
}

export type NormalizedMovieMetadata = {
  tmdbId: number
  title: string
  originalTitle: string
  releaseDate: string | null
  releaseYear: number | null
  posterPath: string | null
  backdropPath: string | null
  overview: string
  runtime: number | null
  genres: string[]
  directors: string[]
  topCast: string[]
  imdbId: string | null
}

const base = '/.netlify/functions/tmdb'

export const getTmdbImageUrl = (path: string | null, size: 'w92' | 'w185' | 'w342' | 'w500' | 'w780' | 'original' = 'w342') =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : null

export const searchTmdbMovies = async (query: string): Promise<TmdbSearchResult[]> => {
  const response = await fetch(`${base}/search?query=${encodeURIComponent(query)}`)
  if (!response.ok) throw new Error('TMDb search failed.')
  const data = (await response.json()) as { results?: TmdbSearchResult[] }
  return data.results ?? []
}

export const getTmdbMovieDetails = async (tmdbId: number): Promise<NormalizedMovieMetadata> => {
  const response = await fetch(`${base}/movie?id=${tmdbId}`)
  if (!response.ok) throw new Error('TMDb movie details failed.')
  return normalizeTmdbMovieDetails(await response.json())
}

export const normalizeTmdbMovieDetails = (response: any): NormalizedMovieMetadata => {
  const releaseDate = typeof response.release_date === 'string' && response.release_date ? response.release_date : null
  const year = releaseDate ? Number(releaseDate.slice(0, 4)) : null
  const crew = Array.isArray(response.credits?.crew) ? response.credits.crew : []
  const cast = Array.isArray(response.credits?.cast) ? response.credits.cast : []

  return {
    tmdbId: response.id,
    title: response.title ?? '',
    originalTitle: response.original_title ?? response.title ?? '',
    releaseDate,
    releaseYear: year && Number.isFinite(year) ? year : null,
    posterPath: response.poster_path ?? null,
    backdropPath: response.backdrop_path ?? null,
    overview: response.overview ?? '',
    runtime: typeof response.runtime === 'number' ? response.runtime : null,
    genres: Array.isArray(response.genres) ? response.genres.map((genre: any) => genre?.name).filter(Boolean) : [],
    directors: crew.filter((member: any) => member?.job === 'Director').map((member: any) => member?.name).filter(Boolean),
    topCast: cast.slice(0, 5).map((member: any) => member?.name).filter(Boolean),
    imdbId: response.external_ids?.imdb_id ?? null,
  }
}
