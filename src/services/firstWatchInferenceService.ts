import type { FilmEntry } from '../types/film'
import type { FilmLogService } from './filmLogService'
import { fetchTmdbMovieDetails } from './tmdbService'

export type FirstWatchInferenceOptions = {
  windowDays?: number
  onProgress?: (message: string) => void
}

export type FirstWatchInferenceResult = {
  total: number
  skippedExistingFirstWatch: number
  skippedMissingTmdbId: number
  skippedMissingWatchDate: number
  skippedMissingReleaseDate: number
  outsideWindow: number
  markedFirstWatch: number
  savedReleaseDateOnly: number
  failed: number
}

const MS_PER_DAY = 86_400_000
const DEFAULT_WINDOW_DAYS = 365

const parseIsoDateUtc = (value: string | null | undefined): number | null => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const time = Date.parse(`${value}T00:00:00Z`)
  return Number.isNaN(time) ? null : time
}

const getReleaseDate = async (film: FilmEntry): Promise<string | null> => {
  const existingReleaseDate = film.metadata.tmdb?.releaseDate ?? null
  if (existingReleaseDate) return existingReleaseDate

  const tmdbId = film.metadata.tmdb?.id
  if (typeof tmdbId !== 'number') return null

  const details = await fetchTmdbMovieDetails(tmdbId)
  return details.releaseDate
}

const isWithinReleaseWindow = (
  dateWatched: string,
  releaseDate: string,
  windowDays: number,
) => {
  const watchedTime = parseIsoDateUtc(dateWatched)
  const releaseTime = parseIsoDateUtc(releaseDate)
  if (watchedTime === null || releaseTime === null) return null

  const daysAfterRelease = Math.floor((watchedTime - releaseTime) / MS_PER_DAY)
  return daysAfterRelease <= windowDays
}

export const inferFirstWatchesFromTmdbReleaseDates = async (
  service: FilmLogService,
  films: FilmEntry[],
  options: FirstWatchInferenceOptions = {},
): Promise<FirstWatchInferenceResult> => {
  const windowDays = options.windowDays ?? DEFAULT_WINDOW_DAYS
  const result: FirstWatchInferenceResult = {
    total: films.length,
    skippedExistingFirstWatch: 0,
    skippedMissingTmdbId: 0,
    skippedMissingWatchDate: 0,
    skippedMissingReleaseDate: 0,
    outsideWindow: 0,
    markedFirstWatch: 0,
    savedReleaseDateOnly: 0,
    failed: 0,
  }

  for (const film of films) {
    if (film.metadata.firstWatch !== null && film.metadata.firstWatch !== undefined) {
      result.skippedExistingFirstWatch += 1
      options.onProgress?.(`[skip] ${film.title}: first-watch value already set`)
      continue
    }

    if (typeof film.metadata.tmdb?.id !== 'number') {
      result.skippedMissingTmdbId += 1
      options.onProgress?.(`[skip] ${film.title}: missing TMDb ID`)
      continue
    }

    if (parseIsoDateUtc(film.dateWatched) === null) {
      result.skippedMissingWatchDate += 1
      options.onProgress?.(`[skip] ${film.title}: missing watch date`)
      continue
    }

    try {
      const releaseDate = await getReleaseDate(film)

      if (!releaseDate) {
        result.skippedMissingReleaseDate += 1
        options.onProgress?.(`[skip] ${film.title}: TMDb has no release date`)
        continue
      }

      const isFirstWatchGuess = isWithinReleaseWindow(film.dateWatched, releaseDate, windowDays)

      if (isFirstWatchGuess === null) {
        result.skippedMissingReleaseDate += 1
        options.onProgress?.(`[skip] ${film.title}: invalid release or watch date`)
        continue
      }

      const shouldSaveReleaseDate = !film.metadata.tmdb.releaseDate
      if (isFirstWatchGuess) {
        await service.updateEntry({
          ...film,
          metadata: {
            ...film.metadata,
            firstWatch: true,
            tmdb: {
              ...film.metadata.tmdb,
              releaseDate,
            },
          },
        })
        result.markedFirstWatch += 1
        options.onProgress?.(`[ok] ${film.title}: marked first watch (${releaseDate})`)
        continue
      }

      result.outsideWindow += 1
      if (shouldSaveReleaseDate) {
        await service.updateEntry({
          ...film,
          metadata: {
            ...film.metadata,
            tmdb: {
              ...film.metadata.tmdb,
              releaseDate,
            },
          },
        })
        result.savedReleaseDateOnly += 1
        options.onProgress?.(`[ok] ${film.title}: saved release date only (${releaseDate})`)
      } else {
        options.onProgress?.(`[skip] ${film.title}: watched more than ${windowDays} days after release`)
      }
    } catch (error) {
      result.failed += 1
      const message = error instanceof Error ? error.message : 'Unknown error'
      options.onProgress?.(`[error] ${film.title}: ${message}`)
    }
  }

  options.onProgress?.(
    `Finished. Marked=${result.markedFirstWatch}, saved release date only=${result.savedReleaseDateOnly}, outside window=${result.outsideWindow}, failed=${result.failed}`,
  )

  return result
}
