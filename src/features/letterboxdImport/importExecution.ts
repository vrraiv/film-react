import type { FilmLogService } from '../../services/filmLogService'
import type { FilmEntry, FilmMetadata } from '../../types/film'
import type { LetterboxdImportCandidate } from './importPlan'
import type { LetterboxdParsedRow } from './types'

export type LetterboxdImportResult = {
  created: FilmEntry[]
  updated: FilmEntry[]
  skippedCount: number
}

const createEntryId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const defaultLetterboxdMetadata = (row: LetterboxdParsedRow): FilmMetadata => ({
  dateLogged: new Date().toISOString(),
  firstWatch: row.rewatch === null ? null : !row.rewatch,
  watchContext: '',
  watchContextNote: '',
  ownedFormats: [],
  onWishlist: false,
  tmdb: null,
  source: 'letterboxd',
  sourceUrl: row.sourceUrl,
  legacyTags: row.legacyTags,
  tmdbMatchStatus: 'not_attempted',
})

const mergeLegacyTags = (existingTags: string[] = [], nextTags: string[] = []) =>
  [...new Set([...existingTags, ...nextTags])]

export const createFilmEntryFromLetterboxdRow = (
  row: LetterboxdParsedRow,
): FilmEntry => ({
  id: createEntryId(),
  title: row.title,
  releaseYear: row.releaseYear,
  dateWatched: row.dateWatched,
  rating: row.rating,
  tags: [],
  metadata: defaultLetterboxdMetadata(row),
  notes: row.notes,
  isPublic: true,
})

export const mergeLetterboxdRowIntoExistingEntry = (
  existingEntry: FilmEntry,
  row: LetterboxdParsedRow,
): FilmEntry => ({
  ...existingEntry,
  rating: existingEntry.rating ?? row.rating,
  notes: existingEntry.notes || row.notes,
  tags: existingEntry.tags,
  metadata: {
    ...existingEntry.metadata,
    source: 'letterboxd',
    sourceUrl: existingEntry.metadata.sourceUrl || row.sourceUrl,
    legacyTags: mergeLegacyTags(existingEntry.metadata.legacyTags, row.legacyTags),
    tmdbMatchStatus: existingEntry.metadata.tmdb?.id
      ? 'matched'
      : existingEntry.metadata.tmdbMatchStatus ?? 'not_attempted',
    firstWatch:
      existingEntry.metadata.firstWatch ??
      (row.rewatch === null ? null : !row.rewatch),
  },
})

export const importSelectedLetterboxdCandidates = async (
  candidates: LetterboxdImportCandidate[],
  selectedIds: Set<string>,
  service: FilmLogService,
): Promise<LetterboxdImportResult> => {
  const created: FilmEntry[] = []
  const updated: FilmEntry[] = []
  let skippedCount = 0

  for (const candidate of candidates) {
    if (!selectedIds.has(candidate.id) || !candidate.canSelect) {
      skippedCount += 1
      continue
    }

    if (candidate.action === 'create') {
      created.push(
        await service.createEntry(createFilmEntryFromLetterboxdRow(candidate.row)),
      )
      continue
    }

    if (candidate.action === 'update' && candidate.existingEntry) {
      updated.push(
        await service.updateEntry(
          mergeLetterboxdRowIntoExistingEntry(candidate.existingEntry, candidate.row),
        ),
      )
      continue
    }

    skippedCount += 1
  }

  return { created, updated, skippedCount }
}
