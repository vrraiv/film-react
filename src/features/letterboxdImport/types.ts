export type LetterboxdCsvKind = 'diary' | 'ratings'

export type LetterboxdParsedRow = {
  importId: string
  sourceKind: LetterboxdCsvKind
  sourceFile: string
  rowNumber: number
  title: string
  releaseYear: number | null
  dateWatched: string
  rating: number | null
  rewatch: boolean | null
  notes: string
  sourceUrl: string
  legacyTags: string[]
  mergedRatingSourceFiles: string[]
}

export type LetterboxdParseIssue = {
  fileName: string
  rowNumber?: number
  message: string
}

export type LetterboxdFileSummary = {
  fileName: string
  sourceKind: LetterboxdCsvKind
  rowCount: number
  importableRowCount: number
}

export type LetterboxdParseResult = {
  rows: LetterboxdParsedRow[]
  issues: LetterboxdParseIssue[]
  summaries: LetterboxdFileSummary[]
}
