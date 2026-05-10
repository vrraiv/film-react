const TMDB_API_BASE = 'https://api.themoviedb.org/3'
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500'

const releaseDatePattern = /^\d{4}-\d{2}-\d{2}$/

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const toReleaseDate = (value: unknown) => {
  if (typeof value !== 'string') {
    return null
  }

  const date = value.slice(0, 10)
  return releaseDatePattern.test(date) ? date : null
}

const getEarliestReleaseDate = (
  entries: Record<string, unknown>[],
  allowedTypes: number[],
) => {
  const allowedTypeSet = new Set(allowedTypes)
  const dates = entries
    .filter((entry) => allowedTypeSet.has(Number(entry.type)))
    .map((entry) => toReleaseDate(entry.release_date))
    .filter((date): date is string => date !== null)
    .sort()

  return dates[0] ?? null
}

const getUsReleaseDate = (releaseDates: unknown) => {
  if (!releaseDates || typeof releaseDates !== 'object') {
    return null
  }

  const results = (releaseDates as Record<string, unknown>).results
  if (!Array.isArray(results)) {
    return null
  }

  const usRelease = results.find((result) => {
    if (!result || typeof result !== 'object') {
      return false
    }

    return (result as Record<string, unknown>).iso_3166_1 === 'US'
  })

  if (!usRelease || typeof usRelease !== 'object') {
    return null
  }

  const entries = (usRelease as Record<string, unknown>).release_dates
  if (!Array.isArray(entries)) {
    return null
  }

  const normalizedEntries = entries.filter(
    (entry): entry is Record<string, unknown> =>
      Boolean(entry) && typeof entry === 'object',
  )

  return (
    getEarliestReleaseDate(normalizedEntries, [2, 3]) ??
    getEarliestReleaseDate(normalizedEntries, [1, 2, 3]) ??
    getEarliestReleaseDate(normalizedEntries, [1, 2, 3, 4, 5, 6])
  )
}

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
  tmdbUrl.searchParams.set('append_to_response', 'credits,release_dates')

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
  const writers = crew
    .filter((person) => {
      if (!person || typeof person !== 'object') return false
      const job = (person as Record<string, unknown>).job
      return job === 'Writer' || job === 'Screenplay' || job === 'Story'
    })
    .map((person) => (person && typeof person === 'object' ? (person as Record<string, unknown>).name : null))
    .filter((name): name is string => typeof name === 'string')
    .filter((name, index, all) => all.indexOf(name) === index)
  const posterPath =
    typeof movie.poster_path === 'string' || movie.poster_path === null ? movie.poster_path : null
  const primaryReleaseDate = toReleaseDate(movie.release_date)
  const releaseDate = getUsReleaseDate(movie.release_dates) ?? primaryReleaseDate

  return jsonResponse(200, {
    id: typeof movie.id === 'number' ? movie.id : null,
    title: typeof movie.title === 'string' ? movie.title : 'Unknown title',
    overview: typeof movie.overview === 'string' && movie.overview.trim().length > 0 ? movie.overview : null,
    releaseDate,
    releaseYear: releaseDate ? Number(releaseDate.slice(0, 4)) : null,
    runtime: typeof movie.runtime === 'number' ? movie.runtime : null,
    popularity: typeof movie.popularity === 'number' ? movie.popularity : null,
    voteAverage: typeof movie.vote_average === 'number' ? movie.vote_average : null,
    voteCount: typeof movie.vote_count === 'number' ? movie.vote_count : null,
    genres: Array.isArray(movie.genres)
      ? movie.genres
          .map((genre) => (genre && typeof genre === 'object' ? (genre as Record<string, unknown>).name : null))
          .filter((name): name is string => typeof name === 'string')
      : [],
    director: typeof director?.name === 'string' ? director.name : null,
    writers,
    cast: cast
      .slice(0, 5)
      .map((actor) => (actor && typeof actor === 'object' ? (actor as Record<string, unknown>).name : null))
      .filter((name): name is string => typeof name === 'string'),
    countries: Array.isArray(movie.production_countries)
      ? movie.production_countries
          .map((country) => (country && typeof country === 'object' ? (country as Record<string, unknown>).iso_3166_1 : null))
          .filter((code): code is string => typeof code === 'string')
      : [],
    languages: Array.isArray(movie.spoken_languages)
      ? movie.spoken_languages
          .map((language) => (language && typeof language === 'object' ? (language as Record<string, unknown>).iso_639_1 : null))
          .filter((code): code is string => typeof code === 'string')
      : [],
    posterPath,
    posterUrl: typeof posterPath === 'string' ? `${TMDB_IMAGE_BASE}${posterPath}` : null,
  })
}
