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
  const movieId = url.searchParams.get('movieId')?.trim()

  if (!movieId) {
    return response(400, { error: 'movieId is required' })
  }

  const tmdbUrl = new URL(`${TMDB_API_BASE}/movie/${movieId}`)
  tmdbUrl.searchParams.set('append_to_response', 'credits')

  const tmdbResponse = await fetch(tmdbUrl, {
    headers: {
      Authorization: `Bearer ${bearer}`,
      Accept: 'application/json',
    },
  })

  if (!tmdbResponse.ok) {
    return response(tmdbResponse.status, { error: 'TMDb detail request failed.' })
  }

  const movie = await tmdbResponse.json() as Record<string, any>
  const director = (movie.credits?.crew ?? []).find((person: any) => person.job === 'Director')

  return response(200, {
    id: movie.id,
    title: movie.title,
    releaseYear: typeof movie.release_date === 'string' ? Number(movie.release_date.slice(0, 4)) : null,
    runtime: movie.runtime ?? null,
    genres: Array.isArray(movie.genres) ? movie.genres.map((genre: any) => genre.name) : [],
    director: director?.name ?? null,
    cast: Array.isArray(movie.credits?.cast) ? movie.credits.cast.slice(0, 5).map((actor: any) => actor.name) : [],
    posterPath: movie.poster_path ?? null,
    posterUrl: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
  })
}
