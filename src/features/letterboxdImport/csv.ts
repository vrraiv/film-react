import * as Papa from 'papaparse'
import {
  getLetterboxdTitleYearKey,
} from './matching'
import type {
  LetterboxdCsvKind,
  LetterboxdFileSummary,
  LetterboxdParseIssue,
  LetterboxdParseResult,
  LetterboxdParsedRow,
} from './types'

type CsvRecord = Record<string, string | undefined>

const columnAliases = {
  title: ['Name', 'Title'],
  year: ['Year', 'Release Year'],
  dateWatched: ['Watched Date', 'Date Watched', 'Date'],
  rating: ['Rating'],
  rewatch: ['Rewatch', 'Rewatched'],
  notes: ['Review', 'Review Text', 'Notes'],
  sourceUrl: ['Letterboxd URI', 'Letterboxd URL', 'URI', 'URL'],
  tags: ['Tags', 'Tag'],
} as const

// ratings.csv only has a `Date` column (the rating date), not a `Watched Date`.
// Treating it as a watched date stamps the user's whole rating-spree day onto
// the diary, so for ratings rows we look only at explicit watched-date columns.
const dateWatchedAliasesForKind = (
  kind: LetterboxdCsvKind,
): readonly string[] =>
  kind === 'diary' ? columnAliases.dateWatched : ['Watched Date', 'Date Watched']

const normalizeHeader = (value: string) => value.trim().toLocaleLowerCase()

const buildHeaderMap = (headers: string[]) =>
  new Map(headers.map((header) => [normalizeHeader(header), header]))

const hasColumn = (
  headerMap: Map<string, string>,
  aliases: readonly string[],
) => aliases.some((alias) => headerMap.has(normalizeHeader(alias)))

const readColumn = (
  row: CsvRecord,
  headerMap: Map<string, string>,
  aliases: readonly string[],
) => {
  for (const alias of aliases) {
    const header = headerMap.get(normalizeHeader(alias))
    if (header) {
      return (row[header] ?? '').trim()
    }
  }

  return ''
}

const parseYear = (raw: string): { value: number | null; error: string | null } => {
  if (!raw) {
    return { value: null, error: null }
  }

  const year = Number(raw)
  if (!Number.isInteger(year) || year < 1888 || year > 2100) {
    return { value: null, error: 'Release year must be a number between 1888 and 2100.' }
  }

  return { value: year, error: null }
}

const parseDate = (raw: string) => {
  const value = raw.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value
  }

  const slashMatch = value.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/)
  if (slashMatch) {
    const [, year, month, day] = slashMatch
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  const usMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (usMatch) {
    const [, month, day, year] = usMatch
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  return null
}

const parseRating = (
  raw: string,
): { value: number | null; error: string | null } => {
  if (!raw) {
    return { value: null, error: null }
  }

  const rating = Number(raw.replace(',', '.'))
  const isHalfStep = Number.isFinite(rating) && rating * 2 === Math.floor(rating * 2)

  if (!isHalfStep || rating < 0.5 || rating > 5) {
    return { value: null, error: 'Rating must be a 0.5-step value between 0.5 and 5.' }
  }

  return { value: rating, error: null }
}

const parseRewatch = (raw: string): boolean | null => {
  const value = raw.trim().toLocaleLowerCase()
  if (!value) {
    return null
  }

  if (['yes', 'y', 'true', '1'].includes(value)) {
    return true
  }

  if (['no', 'n', 'false', '0'].includes(value)) {
    return false
  }

  return null
}

const parseLegacyTags = (raw: string) =>
  raw
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)

const createImportId = (
  fileName: string,
  rowNumber: number,
  title: string,
  dateWatched: string,
) => `${fileName}:${rowNumber}:${title}:${dateWatched}`

const isBlankRow = (row: CsvRecord) =>
  Object.values(row).every((value) => !String(value ?? '').trim())

const detectSourceKind = (
  fileName: string,
  headerMap: Map<string, string>,
): LetterboxdCsvKind => {
  const normalizedName = fileName.toLocaleLowerCase()

  if (normalizedName.includes('ratings')) {
    return 'ratings'
  }

  if (
    normalizedName.includes('diary') ||
    hasColumn(headerMap, columnAliases.rewatch) ||
    hasColumn(headerMap, columnAliases.notes)
  ) {
    return 'diary'
  }

  return 'ratings'
}

const getMissingRequiredColumns = (
  sourceKind: LetterboxdCsvKind,
  headerMap: Map<string, string>,
) => {
  const requirements: Array<[readonly string[], string]> = [
    [columnAliases.title, 'Name'],
  ]

  if (sourceKind === 'diary') {
    requirements.push([columnAliases.dateWatched, 'Watched Date or Date'])
  } else {
    requirements.push([columnAliases.rating, 'Rating'])
  }

  return requirements
    .filter(([aliases]) => !hasColumn(headerMap, aliases))
    .map(([, label]) => label)
}

const mapCsvRow = (
  row: CsvRecord,
  headerMap: Map<string, string>,
  sourceKind: LetterboxdCsvKind,
  fileName: string,
  rowNumber: number,
): { row: LetterboxdParsedRow | null; issues: LetterboxdParseIssue[] } => {
  const issues: LetterboxdParseIssue[] = []
  const title = readColumn(row, headerMap, columnAliases.title)
  const rawDate = readColumn(row, headerMap, dateWatchedAliasesForKind(sourceKind))
  const rawRating = readColumn(row, headerMap, columnAliases.rating)
  const rawYear = readColumn(row, headerMap, columnAliases.year)
  const parsedDate = parseDate(rawDate)
  const dateWatched = parsedDate ?? ''
  const parsedYear = parseYear(rawYear)
  const parsedRating = parseRating(rawRating)

  if (!title) {
    issues.push({ fileName, rowNumber, message: 'Missing film title.' })
  }

  if (sourceKind === 'diary' && !parsedDate) {
    issues.push({
      fileName,
      rowNumber,
      message: 'Missing or invalid watched date.',
    })
  }

  if (rawDate && !parsedDate && sourceKind === 'ratings') {
    issues.push({
      fileName,
      rowNumber,
      message: 'Watched date column is unparseable; importing without a date.',
    })
  }

  if (parsedYear.error) {
    issues.push({ fileName, rowNumber, message: parsedYear.error })
  }

  if (parsedRating.error) {
    issues.push({ fileName, rowNumber, message: parsedRating.error })
  }

  if (sourceKind === 'ratings' && parsedRating.value === null) {
    issues.push({ fileName, rowNumber, message: 'Ratings rows require a rating.' })
  }

  const blockingIssue =
    !title ||
    (sourceKind === 'diary' && !parsedDate) ||
    parsedYear.error !== null ||
    parsedRating.error !== null ||
    (sourceKind === 'ratings' && parsedRating.value === null)

  if (blockingIssue) {
    return { row: null, issues }
  }

  return {
    row: {
      importId: createImportId(fileName, rowNumber, title, dateWatched),
      sourceKind,
      sourceFile: fileName,
      rowNumber,
      title,
      releaseYear: parsedYear.value,
      dateWatched,
      rating: parsedRating.value,
      rewatch: parseRewatch(readColumn(row, headerMap, columnAliases.rewatch)),
      notes: readColumn(row, headerMap, columnAliases.notes),
      sourceUrl: readColumn(row, headerMap, columnAliases.sourceUrl),
      legacyTags: parseLegacyTags(readColumn(row, headerMap, columnAliases.tags)),
      mergedRatingSourceFiles: [],
    },
    issues,
  }
}

const mergeLegacyTags = (left: string[], right: string[]) =>
  [...new Set([...left, ...right])]

const mergeRatingsIntoDiaryRows = (rows: LetterboxdParsedRow[]) => {
  const diaryRows = rows.filter((row) => row.sourceKind === 'diary')
  const ratingsRows = rows.filter((row) => row.sourceKind === 'ratings')
  const diaryRowsByTitleYear = new Map<string, LetterboxdParsedRow[]>()

  for (const row of diaryRows) {
    const key = getLetterboxdTitleYearKey(row)
    diaryRowsByTitleYear.set(key, [...(diaryRowsByTitleYear.get(key) ?? []), row])
  }

  const unmergedRatingsRows: LetterboxdParsedRow[] = []

  for (const ratingRow of ratingsRows) {
    const matches = diaryRowsByTitleYear.get(getLetterboxdTitleYearKey(ratingRow)) ?? []

    if (matches.length === 0) {
      unmergedRatingsRows.push(ratingRow)
      continue
    }

    const target =
      matches.find((row) => row.dateWatched === ratingRow.dateWatched) ??
      [...matches].sort((left, right) => right.dateWatched.localeCompare(left.dateWatched))[0]

    if (target.rating === null && ratingRow.rating !== null) {
      target.rating = ratingRow.rating
    }

    target.legacyTags = mergeLegacyTags(target.legacyTags, ratingRow.legacyTags)
    target.mergedRatingSourceFiles = [
      ...new Set([...target.mergedRatingSourceFiles, ratingRow.sourceFile]),
    ]

    if (!target.sourceUrl && ratingRow.sourceUrl) {
      target.sourceUrl = ratingRow.sourceUrl
    }
  }

  return [...diaryRows, ...unmergedRatingsRows]
}

const parseLetterboxdFile = (file: File) =>
  new Promise<{
    rows: LetterboxdParsedRow[]
    issues: LetterboxdParseIssue[]
    summary: LetterboxdFileSummary
  }>((resolve) => {
    Papa.parse<CsvRecord>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (header) => header.trim(),
      complete: (result: Papa.ParseResult<CsvRecord>) => {
        const headers = result.meta.fields?.filter(Boolean) ?? []
        const headerMap = buildHeaderMap(headers)
        const sourceKind = detectSourceKind(file.name, headerMap)
        const missingColumns = getMissingRequiredColumns(sourceKind, headerMap)
        const issues: LetterboxdParseIssue[] = result.errors.map((error) => ({
          fileName: file.name,
          rowNumber: typeof error.row === 'number' ? error.row + 2 : undefined,
          message: error.message,
        }))

        if (headers.length === 0 || result.data.length === 0) {
          resolve({
            rows: [],
            issues: [
              ...issues,
              { fileName: file.name, message: 'The CSV file is empty.' },
            ],
            summary: {
              fileName: file.name,
              sourceKind,
              rowCount: 0,
              importableRowCount: 0,
            },
          })
          return
        }

        if (missingColumns.length > 0) {
          resolve({
            rows: [],
            issues: [
              ...issues,
              {
                fileName: file.name,
                message: `Missing required column: ${missingColumns.join(', ')}.`,
              },
            ],
            summary: {
              fileName: file.name,
              sourceKind,
              rowCount: result.data.length,
              importableRowCount: 0,
            },
          })
          return
        }

        const rows: LetterboxdParsedRow[] = []

        result.data.forEach((csvRow, index) => {
          if (isBlankRow(csvRow)) {
            return
          }

          const mapped = mapCsvRow(
            csvRow,
            headerMap,
            sourceKind,
            file.name,
            index + 2,
          )
          issues.push(...mapped.issues)

          if (mapped.row) {
            rows.push(mapped.row)
          }
        })

        resolve({
          rows,
          issues,
          summary: {
            fileName: file.name,
            sourceKind,
            rowCount: result.data.length,
            importableRowCount: rows.length,
          },
        })
      },
      error: (error) => {
        resolve({
          rows: [],
          issues: [{ fileName: file.name, message: error.message }],
          summary: {
            fileName: file.name,
            sourceKind: file.name.toLocaleLowerCase().includes('ratings')
              ? 'ratings'
              : 'diary',
            rowCount: 0,
            importableRowCount: 0,
          },
        })
      },
    })
  })

export const parseLetterboxdFiles = async (
  files: File[],
): Promise<LetterboxdParseResult> => {
  if (files.length === 0) {
    return {
      rows: [],
      issues: [{ fileName: 'CSV selection', message: 'Choose at least one CSV file.' }],
      summaries: [],
    }
  }

  const parsedFiles = await Promise.all(files.map((file) => parseLetterboxdFile(file)))
  const rows = mergeRatingsIntoDiaryRows(parsedFiles.flatMap((fileResult) => fileResult.rows))

  return {
    rows,
    issues: parsedFiles.flatMap((fileResult) => fileResult.issues),
    summaries: parsedFiles.map((fileResult) => fileResult.summary),
  }
}
