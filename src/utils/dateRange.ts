export type PeriodPreset = 'all' | 'this-year' | 'last-90-days' | 'custom'

export type DateRange = { start: string; end: string } | null

const todayIso = (): string => new Date().toISOString().slice(0, 10)

const subtractDays = (iso: string, days: number): string => {
  const date = new Date(`${iso}T00:00:00`)
  date.setDate(date.getDate() - days)
  return date.toISOString().slice(0, 10)
}

export const getRangeForPreset = (
  preset: PeriodPreset,
  custom?: { start?: string; end?: string },
): DateRange => {
  switch (preset) {
    case 'all':
      return null
    case 'this-year':
      return { start: `${new Date().getFullYear()}-01-01`, end: todayIso() }
    case 'last-90-days':
      return { start: subtractDays(todayIso(), 90), end: todayIso() }
    case 'custom': {
      if (!custom?.start || !custom?.end) return null
      return { start: custom.start, end: custom.end }
    }
  }
}

export const isWithinRange = (dateWatched: string, range: DateRange): boolean => {
  if (range === null) return true
  return dateWatched >= range.start && dateWatched <= range.end
}
