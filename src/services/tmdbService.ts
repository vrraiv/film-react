export type TmdbSearchResult = {
  id: number
  title: string
  release_date?: string
  poster_path?: string | null
}

export type TmdbMovieDetails = {
  id: number
  title: string
  releaseYear: number | null
  runtime: number | null
  genres: string[]
  director: string | null
  cast: string[]
  posterPath: string | null
  posterUrl: string | null
}

const request = async <T>(path: string): Promise<T> => {
  const response = await fetch(path)
  if (!response.ok) {
    throw new Error('TMDb request failed')
  }

  return response.json() as Promise<T>
}

export const searchTmdbMovies = async (query: string) => {
  const encoded = encodeURIComponent(query)
  const payload = await request<{ results: TmdbSearchResult[] }>(`/.netlify/functions/tmdb-search-movie?query=${encoded}`)
  return payload.results
}

export const fetchTmdbMovieDetails = async (movieId: number) =>
  request<TmdbMovieDetails>(`/.netlify/functions/tmdb-movie-details?movieId=${movieId}`)
