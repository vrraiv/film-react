const TMDB_API_BASE = 'https://api.themoviedb.org/3'

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

  const tmdbResponse = await fetch(tmdbUrl, {
    headers: {
      Authorization: `Bearer ${bearer}`,
      Accept: 'application/json',
    },
  })

  if (!tmdbResponse.ok) {
    return response(tmdbResponse.status, { error: 'TMDb search request failed.' })
  }

  const payload = await tmdbResponse.json() as { results?: Array<Record<string, unknown>> }

  const results = (payload.results ?? []).slice(0, 8).map((movie) => ({
    id: movie.id,
    title: movie.title,
    release_date: movie.release_date,
    poster_path: movie.poster_path,
  }))

  return response(200, { results })
}
