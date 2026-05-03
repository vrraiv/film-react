import type { FilmEntry } from '../../types/film'
import type { LetterboxdParsedRow } from './types'

export const normalizeTitleForImport = (title: string) =>
  title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase()
    .replace(/&/g, 'and')
    .replace(/['\u2019]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const tokenizeTitle = (title: string) =>
  normalizeTitleForImport(title).split(/\s+/).filter(Boolean)

const titleWithoutSubtitle = (title: string) =>
  normalizeTitleForImport(title.split(/[:\-–—]/)[0] ?? title)

const getTokenOverlapScore = (leftTitle: string, rightTitle: string) => {
  const leftTokens = tokenizeTitle(leftTitle)
  const rightTokens = new Set(tokenizeTitle(rightTitle))

  if (leftTokens.length === 0) {
    return 0
  }

  const matchingTokens = leftTokens.filter((token) => rightTokens.has(token)).length
  return matchingTokens / leftTokens.length
}

export const getFuzzyTitleMatchScore = (leftTitle: string, rightTitle: string) => {
  const left = normalizeTitleForImport(leftTitle)
  const right = normalizeTitleForImport(rightTitle)

  if (!left || !right) {
    return 0
  }

  if (left === right) {
    return 1
  }

  if (titleWithoutSubtitle(leftTitle) === titleWithoutSubtitle(rightTitle)) {
    return 0.95
  }

  if (left.startsWith(`${right} `) || right.startsWith(`${left} `)) {
    return 0.9
  }

  return getTokenOverlapScore(leftTitle, rightTitle)
}

export const createTitleYearKey = (
  title: string,
  releaseYear: number | null | undefined,
) => `${normalizeTitleForImport(title)}|${releaseYear ?? ''}`

export const createEntryKey = (
  title: string,
  releaseYear: number | null | undefined,
  dateWatched: string,
) => `${createTitleYearKey(title, releaseYear)}|${dateWatched}`

export const getFilmTitleYearKey = (film: FilmEntry) =>
  createTitleYearKey(film.title, film.releaseYear)

export const getFilmEntryKey = (film: FilmEntry) =>
  createEntryKey(film.title, film.releaseYear, film.dateWatched)

export const getLetterboxdTitleYearKey = (row: LetterboxdParsedRow) =>
  createTitleYearKey(row.title, row.releaseYear)

export const getLetterboxdEntryKey = (row: LetterboxdParsedRow) =>
  createEntryKey(row.title, row.releaseYear, row.dateWatched)
