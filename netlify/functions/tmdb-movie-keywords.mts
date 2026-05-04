const TMDB_API_BASE = 'https://api.themoviedb.org/3'

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

  const tmdbUrl = `${TMDB_API_BASE}/movie/${movieId}/keywords`

  let tmdbResponse: Response
  try {
    tmdbResponse = await fetch(tmdbUrl, {
      headers: {
        Authorization: `Bearer ${bearer}`,
        Accept: 'application/json',
      },
    })
  } catch {
    return jsonResponse(502, { error: 'TMDb keywords upstream is unavailable.' })
  }

  if (!tmdbResponse.ok) {
    return jsonResponse(tmdbResponse.status, { error: 'TMDb keyword request failed.' })
  }

  const payload = await tmdbResponse.json() as Record<string, unknown>
  const keywords = Array.isArray(payload.keywords)
    ? payload.keywords
      .map((item) => (item && typeof item === 'object' ? (item as Record<string, unknown>).name : null))
      .filter((name): name is string => typeof name === 'string' && name.trim().length > 0)
    : []

  return jsonResponse(200, { keywords })
}
