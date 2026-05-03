import type { FilmEntry } from '../../types/film'
import {
  getFilmEntryKey,
  getFilmTitleYearKey,
  getLetterboxdEntryKey,
  getLetterboxdTitleYearKey,
} from './matching'
import type { LetterboxdParsedRow } from './types'

export type LetterboxdImportStatus =
  | 'new'
  | 'rating-only'
  | 'possible-rewatch'
  | 'rating-merge'
  | 'duplicate'
  | 'file-duplicate'

export type LetterboxdImportAction = 'create' | 'update' | 'skip'

export type LetterboxdImportCandidate = {
  id: string
  row: LetterboxdParsedRow
  status: LetterboxdImportStatus
  action: LetterboxdImportAction
  message: string
  canSelect: boolean
  selectedByDefault: boolean
  existingEntry?: FilmEntry
}

const indexExistingEntries = (films: FilmEntry[]) => {
  const byEntryKey = new Map<string, FilmEntry>()
  const byTitleYearKey = new Map<string, FilmEntry[]>()

  for (const film of films) {
    byEntryKey.set(getFilmEntryKey(film), film)

    const titleYearKey = getFilmTitleYearKey(film)
    byTitleYearKey.set(titleYearKey, [
      ...(byTitleYearKey.get(titleYearKey) ?? []),
      film,
    ])
  }

  for (const [key, entries] of byTitleYearKey) {
    byTitleYearKey.set(
      key,
      [...entries].sort((left, right) => right.dateWatched.localeCompare(left.dateWatched)),
    )
  }

  return { byEntryKey, byTitleYearKey }
}

const findRatingMergeTarget = (
  row: LetterboxdParsedRow,
  exactMatch: FilmEntry | undefined,
  titleYearMatches: FilmEntry[],
) => {
  if (row.rating === null) {
    return null
  }

  return (
    exactMatch ??
    titleYearMatches.find((entry) => entry.rating === null) ??
    titleYearMatches[0] ??
    null
  )
}

export const planLetterboxdImport = (
  rows: LetterboxdParsedRow[],
  existingFilms: FilmEntry[],
): LetterboxdImportCandidate[] => {
  const existing = indexExistingEntries(existingFilms)
  const seenEntryKeys = new Set<string>()
  const seenTitleYearKeys = new Map<string, LetterboxdParsedRow[]>()

  return rows.map((row) => {
    const entryKey = getLetterboxdEntryKey(row)
    const titleYearKey = getLetterboxdTitleYearKey(row)
    const exactMatch = existing.byEntryKey.get(entryKey)
    const titleYearMatches = existing.byTitleYearKey.get(titleYearKey) ?? []
    const sameTitleYearPreviewRows = seenTitleYearKeys.get(titleYearKey) ?? []
    const candidateId = row.importId

    if (seenEntryKeys.has(entryKey)) {
      return {
        id: candidateId,
        row,
        status: 'file-duplicate',
        action: 'skip',
        message: 'Another selected CSV row has the same title, year, and watched date.',
        canSelect: false,
        selectedByDefault: false,
      }
    }

    seenEntryKeys.add(entryKey)
    seenTitleYearKeys.set(titleYearKey, [...sameTitleYearPreviewRows, row])

    if (row.sourceKind === 'ratings') {
      const ratingMergeTarget = findRatingMergeTarget(row, exactMatch, titleYearMatches)

      if (ratingMergeTarget) {
        if (ratingMergeTarget.rating === null) {
          return {
            id: candidateId,
            row,
            status: 'rating-merge',
            action: 'update',
            message: 'A matching log entry exists. The missing rating can be merged into it.',
            canSelect: true,
            selectedByDefault: true,
            existingEntry: ratingMergeTarget,
          }
        }

        return {
          id: candidateId,
          row,
          status: 'duplicate',
          action: 'skip',
          message: 'A matching log entry already has a rating, so no duplicate will be created.',
          canSelect: false,
          selectedByDefault: false,
          existingEntry: ratingMergeTarget,
        }
      }

      if (sameTitleYearPreviewRows.length > 0) {
        return {
          id: candidateId,
          row,
          status: 'duplicate',
          action: 'skip',
          message: 'A diary row for this title and year is already in the preview.',
          canSelect: false,
          selectedByDefault: false,
        }
      }
    }

    if (exactMatch) {
      if (exactMatch.rating === null && row.rating !== null) {
        return {
          id: candidateId,
          row,
          status: 'rating-merge',
          action: 'update',
          message: 'The film is already logged for this date. The missing rating can be merged.',
          canSelect: true,
          selectedByDefault: true,
          existingEntry: exactMatch,
        }
      }

      return {
        id: candidateId,
        row,
        status: 'duplicate',
        action: 'skip',
        message: 'The film is already logged with the same title, year, and watched date.',
        canSelect: false,
        selectedByDefault: false,
        existingEntry: exactMatch,
      }
    }

    if (
      titleYearMatches.length > 0 ||
      sameTitleYearPreviewRows.some((previewRow) => previewRow.dateWatched !== row.dateWatched)
    ) {
      return {
        id: candidateId,
        row,
        status: 'possible-rewatch',
        action: 'create',
        message: 'Same title and year with a different watched date. This will import as a rewatch.',
        canSelect: true,
        selectedByDefault: true,
      }
    }

    if (row.sourceKind === 'ratings') {
      return {
        id: candidateId,
        row,
        status: 'rating-only',
        action: 'create',
        message: 'No diary entry matched this rating row. It can be imported using the rating date.',
        canSelect: true,
        selectedByDefault: true,
      }
    }

    return {
      id: candidateId,
      row,
      status: 'new',
      action: 'create',
      message: 'Ready to import as a new film log entry.',
      canSelect: true,
      selectedByDefault: true,
    }
  })
}
