const baseUrl = 'https://api.themoviedb.org/3'
const json = (statusCode: number, body: Record<string, unknown>) => ({ statusCode, headers: { 'content-type': 'application/json; charset=utf-8' }, body: JSON.stringify(body) })

export const handler = async (event: { httpMethod: string; path: string; queryStringParameters?: Record<string, string | undefined> }) => {
  const token = process.env.TMDB_BEARER_TOKEN?.trim()
  if (!token) return json(500, { error: 'TMDb is not configured on the server.' })
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed.' })

  const action = event.path.split('/').pop()

  try {
    if (action === 'search') {
      const query = event.queryStringParameters?.query?.trim()
      if (!query) return json(400, { error: 'Missing query parameter.' })
      const response = await fetch(`${baseUrl}/search/movie?query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`, { headers: { Authorization: `Bearer ${token}` } })
      if (!response.ok) return json(response.status, { error: 'Could not search TMDb.' })
      return json(200, await response.json())
    }

    if (action === 'movie') {
      const id = event.queryStringParameters?.id?.trim()
      if (!id) return json(400, { error: 'Missing id parameter.' })
      const response = await fetch(`${baseUrl}/movie/${encodeURIComponent(id)}?append_to_response=credits,release_dates,external_ids&language=en-US`, { headers: { Authorization: `Bearer ${token}` } })
      if (!response.ok) return json(response.status, { error: 'Could not load TMDb movie details.' })
      return json(200, await response.json())
    }

    return json(404, { error: 'Unknown TMDb endpoint.' })
  } catch {
    return json(500, { error: 'TMDb request failed.' })
  }
}
