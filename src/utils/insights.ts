import { TAG_CATEGORIES, getTagById, type TagCategoryId } from '../config/filmTags'
import type { FilmEntry } from '../types/film'

export type RatingBucket = { rating: number; count: number }

export type CalendarCell = { date: string; count: number }

export type MonthBucket = { month: number; label: string; count: number }
export type DayOfWeekBucket = { day: number; label: string; count: number }

export type DecadeBucket = {
  decade: number
  label: string
  count: number
  averageRating: number | null
}

export type RuntimeBucket = {
  label: string
  count: number
  min: number
  max: number | null
}

export type TagCategoryStat = {
  categoryId: TagCategoryId
  label: string
  share: number
  filmCount: number
  topTag: { id: string; label: string; count: number } | null
}

export type DirectorStat = {
  director: string
  averageRating: number
  filmCount: number
}

export type DecadeRanking = {
  decade: number
  label: string
  averageRating: number
  filmCount: number
}

export type TopFilm = {
  id: string
  title: string
  year: number | null
  rating: number
  dateWatched: string
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const parseDateLocal = (iso: string): Date | null => {
  if (!iso) return null
  const date = new Date(`${iso}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

const releaseYearOf = (film: FilmEntry): number | null => {
  const tmdb = film.metadata.tmdb?.releaseYear ?? film.tmdbMetadata?.releaseYear ?? null
  if (typeof tmdb === 'number') return tmdb
  return film.releaseYear ?? null
}

const directorOf = (film: FilmEntry): string | null => {
  const value = film.metadata.tmdb?.director ?? film.tmdbMetadata?.director ?? null
  return value && value.trim() ? value.trim() : null
}

const runtimeOf = (film: FilmEntry): number | null => {
  const value = film.metadata.tmdb?.runtime ?? film.tmdbMetadata?.runtime ?? null
  return typeof value === 'number' && value > 0 ? value : null
}

export const buildCalendarHeatmap = (
  films: FilmEntry[],
  weeks = 26,
): { cells: CalendarCell[]; max: number; start: string; end: string } => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dayOfWeek = today.getDay()
  const lastSaturday = new Date(today)
  lastSaturday.setDate(today.getDate() + (6 - dayOfWeek))

  const totalDays = weeks * 7
  const start = new Date(lastSaturday)
  start.setDate(lastSaturday.getDate() - (totalDays - 1))

  const counts = new Map<string, number>()
  for (const film of films) {
    counts.set(film.dateWatched, (counts.get(film.dateWatched) ?? 0) + 1)
  }

  const cells: CalendarCell[] = []
  for (let i = 0; i < totalDays; i += 1) {
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    const iso = date.toISOString().slice(0, 10)
    cells.push({ date: iso, count: counts.get(iso) ?? 0 })
  }

  const max = cells.reduce((best, cell) => Math.max(best, cell.count), 0)
  return {
    cells,
    max,
    start: start.toISOString().slice(0, 10),
    end: lastSaturday.toISOString().slice(0, 10),
  }
}

export const buildMonthBuckets = (films: FilmEntry[]): MonthBucket[] => {
  const counts = new Array(12).fill(0)
  for (const film of films) {
    const date = parseDateLocal(film.dateWatched)
    if (date) counts[date.getMonth()] += 1
  }
  return MONTH_LABELS.map((label, index) => ({ month: index, label, count: counts[index] }))
}

export const buildDayOfWeekBuckets = (films: FilmEntry[]): DayOfWeekBucket[] => {
  const counts = new Array(7).fill(0)
  for (const film of films) {
    const date = parseDateLocal(film.dateWatched)
    if (date) counts[date.getDay()] += 1
  }
  return DAY_LABELS.map((label, index) => ({ day: index, label, count: counts[index] }))
}

export const buildDecadeBuckets = (films: FilmEntry[]): DecadeBucket[] => {
  const groups = new Map<number, { count: number; ratingTotal: number; ratingCount: number }>()
  for (const film of films) {
    const year = releaseYearOf(film)
    if (year === null) continue
    const decade = Math.floor(year / 10) * 10
    const entry = groups.get(decade) ?? { count: 0, ratingTotal: 0, ratingCount: 0 }
    entry.count += 1
    if (film.rating !== null) {
      entry.ratingTotal += film.rating
      entry.ratingCount += 1
    }
    groups.set(decade, entry)
  }
  return [...groups.entries()]
    .map(([decade, value]) => ({
      decade,
      label: `${decade}s`,
      count: value.count,
      averageRating: value.ratingCount ? value.ratingTotal / value.ratingCount : null,
    }))
    .sort((a, b) => a.decade - b.decade)
}

const RUNTIME_RANGES: Array<{ label: string; min: number; max: number | null }> = [
  { label: '<80', min: 0, max: 79 },
  { label: '80–99', min: 80, max: 99 },
  { label: '100–119', min: 100, max: 119 },
  { label: '120–139', min: 120, max: 139 },
  { label: '140–159', min: 140, max: 159 },
  { label: '160+', min: 160, max: null },
]

export const buildRuntimeHistogram = (films: FilmEntry[]): RuntimeBucket[] => {
  return RUNTIME_RANGES.map((range) => {
    const count = films.filter((film) => {
      const runtime = runtimeOf(film)
      if (runtime === null) return false
      if (runtime < range.min) return false
      if (range.max !== null && runtime > range.max) return false
      return true
    }).length
    return { ...range, count }
  })
}

export const buildTagFingerprint = (films: FilmEntry[]): TagCategoryStat[] => {
  const totalFilms = films.length
  return TAG_CATEGORIES.map((category) => {
    const tagCounts = new Map<string, number>()
    let filmsWithCategory = 0
    for (const film of films) {
      let touched = false
      for (const tagId of film.tags) {
        const tag = getTagById(tagId)
        if (!tag || tag.category !== category.id) continue
        tagCounts.set(tagId, (tagCounts.get(tagId) ?? 0) + 1)
        touched = true
      }
      if (touched) filmsWithCategory += 1
    }
    let topTag: TagCategoryStat['topTag'] = null
    for (const [id, count] of tagCounts.entries()) {
      if (!topTag || count > topTag.count) {
        const tag = getTagById(id)
        topTag = { id, label: tag?.label ?? id, count }
      }
    }
    return {
      categoryId: category.id,
      label: category.label,
      share: totalFilms > 0 ? filmsWithCategory / totalFilms : 0,
      filmCount: filmsWithCategory,
      topTag,
    }
  })
}

export const buildDirectorLeaderboard = (
  films: FilmEntry[],
  options: { minFilms?: number; limit?: number } = {},
): DirectorStat[] => {
  const minFilms = options.minFilms ?? 2
  const limit = options.limit ?? 5
  const groups = new Map<string, { ratingTotal: number; ratingCount: number; filmCount: number }>()
  for (const film of films) {
    const director = directorOf(film)
    if (!director) continue
    const entry = groups.get(director) ?? { ratingTotal: 0, ratingCount: 0, filmCount: 0 }
    entry.filmCount += 1
    if (film.rating !== null) {
      entry.ratingTotal += film.rating
      entry.ratingCount += 1
    }
    groups.set(director, entry)
  }
  return [...groups.entries()]
    .filter(([, value]) => value.filmCount >= minFilms && value.ratingCount > 0)
    .map(([director, value]) => ({
      director,
      filmCount: value.filmCount,
      averageRating: value.ratingTotal / value.ratingCount,
    }))
    .sort((a, b) => b.averageRating - a.averageRating || b.filmCount - a.filmCount)
    .slice(0, limit)
}

export const buildDecadeLeaderboard = (
  decadeBuckets: DecadeBucket[],
  options: { minFilms?: number; limit?: number } = {},
): DecadeRanking[] => {
  const minFilms = options.minFilms ?? 2
  const limit = options.limit ?? 5
  return decadeBuckets
    .filter((bucket) => bucket.count >= minFilms && bucket.averageRating !== null)
    .map((bucket) => ({
      decade: bucket.decade,
      label: bucket.label,
      averageRating: bucket.averageRating ?? 0,
      filmCount: bucket.count,
    }))
    .sort((a, b) => b.averageRating - a.averageRating || b.filmCount - a.filmCount)
    .slice(0, limit)
}

export const buildTopOfYear = (
  films: FilmEntry[],
  year: number,
  limit = 5,
): TopFilm[] => {
  const prefix = `${year}-`
  return films
    .filter((film) => film.dateWatched.startsWith(prefix) && film.rating !== null)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || b.dateWatched.localeCompare(a.dateWatched))
    .slice(0, limit)
    .map((film) => ({
      id: film.id,
      title: film.title,
      year: releaseYearOf(film),
      rating: film.rating ?? 0,
      dateWatched: film.dateWatched,
    }))
}

export const countFirstWatches = (films: FilmEntry[]): number =>
  films.filter((film) => film.metadata.firstWatch === true).length

export const countThisYear = (films: FilmEntry[], year: number): number => {
  const prefix = `${year}-`
  return films.filter((film) => film.dateWatched.startsWith(prefix)).length
}

export const monthsElapsedThisYear = (today = new Date()): number => {
  const month = today.getMonth() + 1
  const dayShare = today.getDate() / 28
  return Math.max(month - 1 + Math.min(dayShare, 1), 0.25)
}
