const TMDB_API_BASE = 'https://api.themoviedb.org/3'
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500'

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
  const movieId = url.searchParams.get('movieId')?.trim()

  if (!movieId) {
    return jsonResponse(400, { error: 'movieId is required' })
  }
  if (!/^\d+$/.test(movieId)) {
    return jsonResponse(400, { error: 'movieId must be numeric' })
  }

  const tmdbUrl = new URL(`${TMDB_API_BASE}/movie/${movieId}`)
  tmdbUrl.searchParams.set('append_to_response', 'credits')

  let tmdbResponse: Response
  try {
    tmdbResponse = await fetch(tmdbUrl, {
      headers: {
        Authorization: `Bearer ${bearer}`,
        Accept: 'application/json',
      },
    })
  } catch {
    return jsonResponse(502, { error: 'TMDb details upstream is unavailable.' })
  }

  if (!tmdbResponse.ok) {
    return jsonResponse(tmdbResponse.status, { error: 'TMDb detail request failed.' })
  }

  const movie = await tmdbResponse.json() as Record<string, unknown>
  const credits = (movie.credits ?? {}) as Record<string, unknown>
  const crew = Array.isArray(credits.crew) ? credits.crew : []
  const cast = Array.isArray(credits.cast) ? credits.cast : []
  const director = crew.find((person) => {
    if (!person || typeof person !== 'object') return false
    return (person as Record<string, unknown>).job === 'Director'
  }) as Record<string, unknown> | undefined
  const posterPath =
    typeof movie.poster_path === 'string' || movie.poster_path === null ? movie.poster_path : null

  return jsonResponse(200, {
    id: typeof movie.id === 'number' ? movie.id : null,
    title: typeof movie.title === 'string' ? movie.title : 'Unknown title',
    releaseYear: typeof movie.release_date === 'string' ? Number(movie.release_date.slice(0, 4)) : null,
    runtime: typeof movie.runtime === 'number' ? movie.runtime : null,
    genres: Array.isArray(movie.genres)
      ? movie.genres
          .map((genre) => (genre && typeof genre === 'object' ? (genre as Record<string, unknown>).name : null))
          .filter((name): name is string => typeof name === 'string')
      : [],
    director: typeof director?.name === 'string' ? director.name : null,
    cast: cast
      .slice(0, 5)
      .map((actor) => (actor && typeof actor === 'object' ? (actor as Record<string, unknown>).name : null))
      .filter((name): name is string => typeof name === 'string'),
    posterPath,
    posterUrl: typeof posterPath === 'string' ? `${TMDB_IMAGE_BASE}${posterPath}` : null,
  })
}
