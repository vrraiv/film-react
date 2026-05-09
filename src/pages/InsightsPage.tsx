import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { CalendarHeatmap } from '../components/insights/CalendarHeatmap'
import { DecadeDonut } from '../components/insights/DecadeDonut'
import { HeroStats } from '../components/insights/HeroStats'
import { Leaderboards } from '../components/insights/Leaderboards'
import { RatingHistogram } from '../components/insights/RatingHistogram'
import { RuntimeHistogram } from '../components/insights/RuntimeHistogram'
import { TagFingerprint } from '../components/insights/TagFingerprint'
import { WatchPatternBars } from '../components/insights/WatchPatternBars'
import { RATING_OPTIONS } from '../config/filmTags'
import { useFilms } from '../hooks/useFilms'
import { fetchPublicFilmEntries } from '../services/publicFilmProfileService'
import type { FilmEntry } from '../types/film'
import {
  buildCalendarHeatmap,
  buildDayOfWeekBuckets,
  buildDecadeBuckets,
  buildDecadeLeaderboard,
  buildDirectorLeaderboard,
  buildMonthBuckets,
  buildRuntimeHistogram,
  buildTagFingerprint,
  buildTopOfYear,
  countFirstWatches,
  countThisYear,
  monthsElapsedThisYear,
  type RatingBucket,
} from '../utils/insights'
import {
  getRangeForPreset,
  isWithinRange,
  type PeriodPreset,
} from '../utils/dateRange'

const periodLabel = (
  preset: PeriodPreset,
  custom: { start: string; end: string },
): string => {
  switch (preset) {
    case 'all':
      return 'All time'
    case 'this-year':
      return `${new Date().getFullYear()} so far`
    case 'last-90-days':
      return 'Last 90 days'
    case 'custom':
      if (!custom.start || !custom.end) return 'Custom range'
      return `${custom.start} → ${custom.end}`
  }
}

const ratingBuckets = [...RATING_OPTIONS]
  .map((rating) => rating.value)
  .sort((left, right) => left - right)

export function InsightsPage() {
  const { user, loading: authLoading } = useAuth()
  const { films: privateFilms, isLoading: isLoadingPrivateFilms } = useFilms(
    undefined,
    { enabled: Boolean(user) },
  )
  const [publicFilms, setPublicFilms] = useState<FilmEntry[]>([])
  const [isLoadingPublicFilms, setIsLoadingPublicFilms] = useState(false)
  const [publicError, setPublicError] = useState<string | null>(null)
  const [period, setPeriod] = useState<PeriodPreset>('all')
  const [customRange, setCustomRange] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  })
  const films = user ? privateFilms : publicFilms
  const isLoading = user ? isLoadingPrivateFilms : authLoading || isLoadingPublicFilms

  const range = useMemo(
    () => getRangeForPreset(period, customRange),
    [period, customRange],
  )

  const scopedFilms = useMemo(
    () => films.filter((film) => isWithinRange(film.dateWatched, range)),
    [films, range],
  )

  useEffect(() => {
    if (authLoading || user) {
      return
    }

    let isMounted = true

    const loadPublicFilms = async () => {
      setIsLoadingPublicFilms(true)
      setPublicError(null)

      try {
        const nextFilms = await fetchPublicFilmEntries()

        if (isMounted) {
          setPublicFilms(nextFilms)
        }
      } catch {
        if (isMounted) {
          setPublicError('We could not load public insights right now.')
        }
      } finally {
        if (isMounted) {
          setIsLoadingPublicFilms(false)
        }
      }
    }

    void loadPublicFilms()

    return () => {
      isMounted = false
    }
  }, [authLoading, user])

  const dedupedForRatings = useMemo(() => {
    const sortedFilms = [...scopedFilms].sort((left, right) => {
      const dateComparison = right.dateWatched.localeCompare(left.dateWatched)
      if (dateComparison !== 0) return dateComparison
      return right.metadata.dateLogged.localeCompare(left.metadata.dateLogged)
    })

    const seenTmdb = new Set<string>()
    const result: FilmEntry[] = []
    for (const film of sortedFilms) {
      const tmdbId = film.metadata.tmdb?.id
      if (tmdbId === null || tmdbId === undefined) {
        result.push(film)
        continue
      }
      const key = `tmdb:${tmdbId}`
      if (seenTmdb.has(key)) continue
      seenTmdb.add(key)
      result.push(film)
    }
    return result
  }, [scopedFilms])

  const ratedFilms = useMemo(
    () => dedupedForRatings.filter((film) => film.rating !== null),
    [dedupedForRatings],
  )

  const ratingDistribution: RatingBucket[] = useMemo(
    () =>
      ratingBuckets.map((rating) => ({
        rating,
        count: ratedFilms.filter((film) => film.rating === rating).length,
      })),
    [ratedFilms],
  )

  const averageRating = ratedFilms.length
    ? ratedFilms.reduce((sum, film) => sum + (film.rating ?? 0), 0) / ratedFilms.length
    : null

  const heatmap = useMemo(() => buildCalendarHeatmap(scopedFilms), [scopedFilms])
  const monthBuckets = useMemo(() => buildMonthBuckets(scopedFilms), [scopedFilms])
  const dayOfWeekBuckets = useMemo(() => buildDayOfWeekBuckets(scopedFilms), [scopedFilms])
  const decadeBuckets = useMemo(() => buildDecadeBuckets(dedupedForRatings), [dedupedForRatings])
  const runtimeBuckets = useMemo(() => buildRuntimeHistogram(dedupedForRatings), [dedupedForRatings])
  const tagFingerprint = useMemo(() => buildTagFingerprint(dedupedForRatings), [dedupedForRatings])
  const directorLeaderboard = useMemo(
    () => buildDirectorLeaderboard(dedupedForRatings),
    [dedupedForRatings],
  )
  const decadeLeaderboard = useMemo(
    () => buildDecadeLeaderboard(decadeBuckets),
    [decadeBuckets],
  )

  const currentYear = new Date().getFullYear()
  const topOfYear = useMemo(
    () => buildTopOfYear(films, currentYear),
    [films, currentYear],
  )
  const thisYearCount = useMemo(() => countThisYear(films, currentYear), [films, currentYear])
  const monthsElapsed = useMemo(() => monthsElapsedThisYear(), [])
  const firstWatchCount = useMemo(() => countFirstWatches(scopedFilms), [scopedFilms])

  const scopeLabel = periodLabel(period, customRange)

  return (
    <section className="page">
      <header className="page__hero">
        <span className="eyebrow">Insights</span>
        <h2 className="page__title">{user ? 'Your watch stats.' : 'Diary insights.'}</h2>
        <p className="page__copy">
          {user
            ? 'A snapshot of how you rate, rewatch, and tag the films you log.'
            : 'A quick look at what shows up most often in the shared film diary.'}
        </p>
        <div className="insights-period">
          <label htmlFor="insightsPeriod">Period</label>
          <select
            id="insightsPeriod"
            value={period}
            onChange={(event) => setPeriod(event.target.value as PeriodPreset)}
          >
            <option value="all">All time</option>
            <option value="this-year">This year</option>
            <option value="last-90-days">Last 90 days</option>
            <option value="custom">Custom range…</option>
          </select>
          {period === 'custom' ? (
            <>
              <input
                type="date"
                aria-label="Start date"
                value={customRange.start}
                onChange={(event) =>
                  setCustomRange((current) => ({ ...current, start: event.target.value }))
                }
              />
              <input
                type="date"
                aria-label="End date"
                value={customRange.end}
                onChange={(event) =>
                  setCustomRange((current) => ({ ...current, end: event.target.value }))
                }
              />
            </>
          ) : null}
        </div>
        <div className="insights-pills">
          {!user ? <span className="meta-pill">Public preview</span> : null}
          {period !== 'all' ? (
            <span className="meta-pill meta-pill--soft">{scopeLabel}</span>
          ) : null}
        </div>
      </header>

      {publicError ? <p className="alert alert--error" role="alert">{publicError}</p> : null}

      {isLoading ? (
        <div className="insights-grid" aria-busy="true" aria-label="Loading insights">
          <div className="skeleton-card skeleton-card--wide" />
          <div className="skeleton-card skeleton-card--wide" />
          <div className="skeleton-card" />
          <div className="skeleton-card" />
        </div>
      ) : (
        <div className="insights-stack">
          <HeroStats
            totalFilms={scopedFilms.length}
            averageRating={averageRating}
            ratedCount={ratedFilms.length}
            firstWatches={firstWatchCount}
            thisYearCount={thisYearCount}
            monthsElapsed={monthsElapsed}
            scopeLabel={scopeLabel}
          />

          <CalendarHeatmap
            cells={heatmap.cells}
            max={heatmap.max}
            start={heatmap.start}
            end={heatmap.end}
          />

          <RatingHistogram buckets={ratingDistribution} ratedCount={ratedFilms.length} />

          <WatchPatternBars months={monthBuckets} daysOfWeek={dayOfWeekBuckets} />

          <div className="insights-grid">
            <DecadeDonut buckets={decadeBuckets} />
            <RuntimeHistogram buckets={runtimeBuckets} />
          </div>

          <TagFingerprint stats={tagFingerprint} />

          <Leaderboards
            topOfYear={topOfYear}
            topDirectors={directorLeaderboard}
            topDecades={decadeLeaderboard}
            yearLabel={String(currentYear)}
          />
        </div>
      )}

      <aside className="page__footnote">
        Ratings, decades, runtimes, and tag stats use the most recent log per film. Calendar and
        watch-pattern charts count every log so rewatches show up.
      </aside>
    </section>
  )
}
