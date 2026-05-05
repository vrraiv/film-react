const TMDB_API_BASE = 'https://api.themoviedb.org/3'
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500'
const MAX_RESULTS = 20

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const parseResults = (
  results: Array<Record<string, unknown>> | undefined,
  source: 'recommendations' | 'similar',
) =>
  (results ?? [])
    .filter((movie): movie is Record<string, unknown> =>
      typeof movie.id === 'number' && typeof movie.title === 'string',
    )
    .slice(0, MAX_RESULTS)
    .map((movie) => {
      const posterPath =
        typeof movie.poster_path === 'string' || movie.poster_path === null ? movie.poster_path : null

      return {
        id: movie.id,
        title: movie.title,
        releaseDate: typeof movie.release_date === 'string' ? movie.release_date : null,
        posterPath,
        posterUrl: typeof posterPath === 'string' ? `${TMDB_IMAGE_BASE}${posterPath}` : null,
        genreIds: Array.isArray(movie.genre_ids)
          ? movie.genre_ids.filter((genreId): genreId is number => typeof genreId === 'number')
          : [],
        popularity: typeof movie.popularity === 'number' ? movie.popularity : null,
        voteAverage: typeof movie.vote_average === 'number' ? movie.vote_average : null,
        source,
      }
    })

export default async (request: Request) => {
  const bearer = process.env.TMDB_READ_ACCESS_TOKEN
  if (!bearer) {
    return jsonResponse(500, { error: 'TMDB_READ_ACCESS_TOKEN is not configured.' })
  }

  const url = new URL(request.url)
  const movieId = url.searchParams.get('movieId')?.trim()
  const source = url.searchParams.get('source')?.trim()

  if (!movieId) {
    return jsonResponse(400, { error: 'movieId is required' })
  }
  if (!/^\d+$/.test(movieId)) {
    return jsonResponse(400, { error: 'movieId must be numeric' })
  }
  if (source !== 'recommendations' && source !== 'similar') {
    return jsonResponse(400, { error: 'source must be recommendations or similar' })
  }

  const tmdbUrl = new URL(`${TMDB_API_BASE}/movie/${movieId}/${source}`)
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
    return jsonResponse(502, { error: 'TMDb candidate upstream is unavailable.' })
  }

  if (!tmdbResponse.ok) {
    return jsonResponse(tmdbResponse.status, { error: 'TMDb candidate request failed.' })
  }

  const payload = await tmdbResponse.json() as { results?: Array<Record<string, unknown>> }
  return jsonResponse(200, { results: parseResults(payload.results, source) })
}
