import type { FilmEntry } from '../types/film'
import type { FilmLogService } from './filmLogService'
import { fetchTmdbMovieDetails } from './tmdbService'

export type ReleaseDateBackfillOptions = {
  force?: boolean
  onProgress?: (message: string) => void
}

export type ReleaseDateBackfillResult = {
  total: number
  skippedMissingTmdbId: number
  skippedAlreadyHasReleaseDate: number
  missingReleaseDate: number
  updated: number
  failed: number
}

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/

const hasReleaseDate = (film: FilmEntry) => {
  const releaseDate = film.metadata.tmdb?.releaseDate
  return typeof releaseDate === 'string' && isoDatePattern.test(releaseDate)
}

export const backfillTmdbReleaseDates = async (
  service: FilmLogService,
  films: FilmEntry[],
  options: ReleaseDateBackfillOptions = {},
): Promise<ReleaseDateBackfillResult> => {
  const result: ReleaseDateBackfillResult = {
    total: films.length,
    skippedMissingTmdbId: 0,
    skippedAlreadyHasReleaseDate: 0,
    missingReleaseDate: 0,
    updated: 0,
    failed: 0,
  }

  for (const film of films) {
    const tmdb = film.metadata.tmdb

    if (!tmdb || typeof tmdb.id !== 'number') {
      result.skippedMissingTmdbId += 1
      options.onProgress?.(`[skip] ${film.title}: missing TMDb ID`)
      continue
    }

    if (!options.force && hasReleaseDate(film)) {
      result.skippedAlreadyHasReleaseDate += 1
      options.onProgress?.(`[skip] ${film.title}: already has release date`)
      continue
    }

    try {
      const details = await fetchTmdbMovieDetails(tmdb.id)

      if (!details.releaseDate) {
        result.missingReleaseDate += 1
        options.onProgress?.(`[skip] ${film.title}: TMDb returned no release date`)
        continue
      }

      await service.updateEntry({
        ...film,
        metadata: {
          ...film.metadata,
          tmdb: {
            ...tmdb,
            releaseDate: details.releaseDate,
            releaseYear: details.releaseYear ?? tmdb.releaseYear ?? null,
          },
        },
      })

      result.updated += 1
      options.onProgress?.(`[ok] ${film.title}: saved release date ${details.releaseDate}`)
    } catch (error) {
      result.failed += 1
      const message = error instanceof Error ? error.message : 'Unknown error'
      options.onProgress?.(`[error] ${film.title}: ${message}`)
    }
  }

  options.onProgress?.(
    `Finished. Updated=${result.updated}, missing release date=${result.missingReleaseDate}, failed=${result.failed}, skipped(no TMDb ID)=${result.skippedMissingTmdbId}, skipped(already has release date)=${result.skippedAlreadyHasReleaseDate}`,
  )

  return result
}
