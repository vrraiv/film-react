import type { FilmEntry, FilmMetadataKeyword } from '../types/film'
import type { FilmLogService } from './filmLogService'
import { fetchTmdbMovieKeywords } from './tmdbService'

export type KeywordBackfillOptions = {
  force?: boolean
  onProgress?: (message: string) => void
}

export type KeywordBackfillResult = {
  total: number
  skippedMissingTmdbId: number
  skippedAlreadyEnriched: number
  updated: number
  failed: number
}

const hasTmdbKeywords = (film: FilmEntry) =>
  Array.isArray(film.metadata.keywords) && film.metadata.keywords.some((keyword) => keyword.source === 'tmdb')

const hasTmdbReleaseDate = (film: FilmEntry) =>
  typeof film.metadata.tmdb?.releaseDate === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(film.metadata.tmdb.releaseDate)

const normalizeTmdbKeywords = (keywords: string[]): FilmMetadataKeyword[] =>
  [...new Set(keywords.map((keyword) => keyword.trim()).filter(Boolean))]
    .map((value) => ({ source: 'tmdb' as const, value }))

export const buildMetadataCompleteness = (films: FilmEntry[]) => ({
  totalLoggedFilms: films.length,
  withTmdbId: films.filter((film) => typeof film.metadata.tmdb?.id === 'number').length,
  withReleaseDate: films.filter(hasTmdbReleaseDate).length,
  withKeywords: films.filter((film) => Array.isArray(film.metadata.keywords) && film.metadata.keywords.length > 0).length,
  withGenres: films.filter((film) => (film.metadata.tmdb?.genres?.length ?? 0) > 0).length,
  withDirector: films.filter((film) => Boolean(film.metadata.tmdb?.director)).length,
  withRuntime: films.filter((film) => typeof film.metadata.tmdb?.runtime === 'number').length,
})

export const backfillTmdbKeywords = async (
  service: FilmLogService,
  films: FilmEntry[],
  options: KeywordBackfillOptions = {},
): Promise<KeywordBackfillResult> => {
  const result: KeywordBackfillResult = {
    total: films.length,
    skippedMissingTmdbId: 0,
    skippedAlreadyEnriched: 0,
    updated: 0,
    failed: 0,
  }

  for (const film of films) {
    const tmdbId = film.metadata.tmdb?.id
    if (typeof tmdbId !== 'number') {
      result.skippedMissingTmdbId += 1
      options.onProgress?.(`[skip] ${film.title}: missing TMDb ID`)
      continue
    }

    if (!options.force && hasTmdbKeywords(film)) {
      result.skippedAlreadyEnriched += 1
      options.onProgress?.(`[skip] ${film.title}: already has TMDb keywords`)
      continue
    }

    try {
      const response = await fetchTmdbMovieKeywords(tmdbId)
      const tmdbKeywords = normalizeTmdbKeywords(response.keywords)
      const nonTmdbKeywords = (film.metadata.keywords ?? []).filter((keyword) => keyword.source !== 'tmdb')
      await service.updateEntry({
        ...film,
        metadata: {
          ...film.metadata,
          keywords: [...nonTmdbKeywords, ...tmdbKeywords],
        },
      })
      result.updated += 1
      options.onProgress?.(`[ok] ${film.title}: saved ${tmdbKeywords.length} TMDb keywords`)
    } catch (error) {
      result.failed += 1
      const message = error instanceof Error ? error.message : 'Unknown error'
      options.onProgress?.(`[error] ${film.title}: ${message}`)
    }
  }

  options.onProgress?.(
    `Finished. Updated=${result.updated}, failed=${result.failed}, skipped(no TMDb ID)=${result.skippedMissingTmdbId}, skipped(already enriched)=${result.skippedAlreadyEnriched}`,
  )

  return result
}
