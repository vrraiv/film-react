const TMDB_API_BASE = 'https://api.themoviedb.org/3'
const MAX_RESULTS = 8

const response = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export default async (request: Request) => {
  const bearer = process.env.TMDB_BEARER_TOKEN
  if (!bearer) {
    return response(500, { error: 'TMDB_BEARER_TOKEN is not configured.' })
  }

  const url = new URL(request.url)
  const query = url.searchParams.get('query')?.trim()

  if (!query) {
    return response(400, { error: 'query is required' })
  }

  const tmdbUrl = new URL(`${TMDB_API_BASE}/search/movie`)
  tmdbUrl.searchParams.set('query', query)
  tmdbUrl.searchParams.set('include_adult', 'false')

  let tmdbResponse: Response
  try {
    tmdbResponse = await fetch(tmdbUrl, {
      headers: {
        Authorization: `Bearer ${bearer}`,
        Accept: 'application/json',
      },
    })
  } catch {
    return response(502, { error: 'TMDb search upstream is unavailable.' })
  }

  if (!tmdbResponse.ok) {
    return response(tmdbResponse.status, { error: 'TMDb search request failed.' })
  }

  const payload = await tmdbResponse.json() as { results?: Array<Record<string, unknown>> }

  const results = (payload.results ?? [])
    .filter((movie): movie is Record<string, unknown> =>
      typeof movie.id === 'number' && typeof movie.title === 'string',
    )
    .slice(0, MAX_RESULTS)
    .map((movie) => ({
      id: movie.id,
      title: movie.title,
      release_date: typeof movie.release_date === 'string' ? movie.release_date : undefined,
      poster_path: typeof movie.poster_path === 'string' || movie.poster_path === null ? movie.poster_path : null,
      overview: typeof movie.overview === 'string' ? movie.overview : '',
    }))

  return response(200, { results })
}
