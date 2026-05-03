const TMDB_API_BASE = 'https://api.themoviedb.org/3'
const MAX_RESULTS = 8

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

export default async (request: Request) => {
  const bearer = process.env.TMDB_READ_ACCESS_TOKEN
  if (!bearer) {
    return jsonResponse(500, { error: 'TMDB_READ_ACCESS_TOKEN is not configured.' })
  }

  const url = new URL(request.url)
  const query = url.searchParams.get('query')?.trim()
  const year = url.searchParams.get('year')?.trim()

  if (!query) {
    return jsonResponse(400, { error: 'query is required' })
  }
  if (year && !/^\d{4}$/.test(year)) {
    return jsonResponse(400, { error: 'year must be a four-digit year' })
  }

  const tmdbUrl = new URL(`${TMDB_API_BASE}/search/movie`)
  tmdbUrl.searchParams.set('query', query)
  tmdbUrl.searchParams.set('include_adult', 'false')
  if (year) {
    tmdbUrl.searchParams.set('year', year)
  }

  let tmdbResponse: Response
  try {
    tmdbResponse = await fetch(tmdbUrl, {
      headers: {
        Authorization: `Bearer ${bearer}`,
        Accept: 'application/json',
      },
    })
  } catch {
    return jsonResponse(502, { error: 'TMDb search upstream is unavailable.' })
  }

  if (!tmdbResponse.ok) {
    return jsonResponse(tmdbResponse.status, { error: 'TMDb search request failed.' })
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

  return jsonResponse(200, { results })
}
