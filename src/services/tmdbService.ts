export type TmdbSearchResult = {
  id: number
  title: string
  release_date?: string
  poster_path?: string | null
  overview?: string
}

export type TmdbCandidateSource = 'recommendations' | 'similar' | 'discover'

export type TmdbCandidateResult = {
  id: number
  title: string
  releaseDate: string | null
  posterPath: string | null
  posterUrl: string | null
  genreIds: number[]
  popularity: number | null
  voteAverage: number | null
  voteCount: number | null
  source: TmdbCandidateSource
}

export type TmdbMovieDetails = {
  id: number
  title: string
  overview: string | null
  releaseDate: string | null
  releaseYear: number | null
  runtime: number | null
  popularity: number | null
  voteAverage: number | null
  voteCount: number | null
  genres: string[]
  director: string | null
  writers: string[]
  cast: string[]
  countries: string[]
  languages: string[]
  posterPath: string | null
  posterUrl: string | null
}

export type TmdbMovieKeywords = {
  keywords: string[]
}

export type TmdbServiceErrorCode =
  | 'function_unavailable'
  | 'request_failed'
  | 'invalid_response'

export class TmdbServiceError extends Error {
  code: TmdbServiceErrorCode

  constructor(message: string, code: TmdbServiceErrorCode) {
    super(message)
    this.name = 'TmdbServiceError'
    this.code = code
  }
}

const request = async <T>(path: string): Promise<T> => {
  const response = await fetch(path)
  const contentType = response.headers.get('Content-Type') ?? ''

  if (!response.ok) {
    if (contentType.includes('application/json')) {
      const payload = await response.json().catch(() => null) as { error?: string } | null
      throw new TmdbServiceError(
        payload?.error ?? `TMDb request failed with status ${response.status}.`,
        'request_failed',
      )
    }

    const body = await response.text()
    const detail = body.trim().slice(0, 180) || response.statusText
    throw new TmdbServiceError(
      `TMDb request failed with status ${response.status}: ${detail}`,
      'request_failed',
    )
  }

  if (!contentType.includes('application/json')) {
    const body = await response.text()
    const returnedAppShell = body.trimStart().startsWith('<!doctype html>')
    const detail = body.trim().slice(0, 180)

    throw new TmdbServiceError(
      returnedAppShell
        ? 'TMDb lookup needs the Netlify Functions dev server. Start the app with npm run dev:netlify and open the Netlify Dev URL, usually http://localhost:8888.'
        : `TMDb lookup returned an unexpected response${detail ? `: ${detail}` : '.'}`,
      returnedAppShell ? 'function_unavailable' : 'invalid_response',
    )
  }

  return response.json() as Promise<T>
}

const requestCache = new Map<string, Promise<unknown>>()

const cachedRequest = async <T>(path: string): Promise<T> => {
  const cached = requestCache.get(path)
  if (cached) return cached as Promise<T>

  const nextRequest = request<T>(path)
  requestCache.set(path, nextRequest)
  return nextRequest
}

export const searchTmdbMovies = async (
  query: string,
  options: { year?: number | null } = {},
) => {
  const encoded = encodeURIComponent(query)
  const yearParam = options.year ? `&year=${encodeURIComponent(String(options.year))}` : ''
  const payload = await request<{ results: TmdbSearchResult[] }>(
    `/.netlify/functions/tmdb-search-movie?query=${encoded}${yearParam}`,
  )
  return payload.results
}

export const fetchTmdbMovieDetails = async (movieId: number) =>
  cachedRequest<TmdbMovieDetails>(`/.netlify/functions/tmdb-movie-details?movieId=${movieId}`)

export const fetchTmdbMovieKeywords = async (movieId: number) =>
  cachedRequest<TmdbMovieKeywords>(`/.netlify/functions/tmdb-movie-keywords?movieId=${movieId}`)

export const fetchTmdbMovieCandidates = async (
  movieId: number,
  source: Exclude<TmdbCandidateSource, 'discover'>,
) =>
  cachedRequest<{ results: TmdbCandidateResult[] }>(
    `/.netlify/functions/tmdb-movie-candidates?movieId=${movieId}&source=${source}`,
  )

export const discoverTmdbMovies = async (genreIds: number[]) =>
  cachedRequest<{ results: TmdbCandidateResult[] }>(
    `/.netlify/functions/tmdb-discover-movies?genreIds=${encodeURIComponent(genreIds.join(','))}`,
  )
