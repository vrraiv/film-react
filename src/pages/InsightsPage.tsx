import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { formatFilmTag } from '../config/filmOptions'
import { RATING_OPTIONS } from '../config/filmTags'
import { useFilms } from '../hooks/useFilms'
import { fetchPublicFilmEntries } from '../services/publicFilmProfileService'
import type { FilmEntry } from '../types/film'
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

type RewatchAggregate = {
  total: number
  count: number
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

  const insights = useMemo(() => {
    const sortedFilms = [...scopedFilms].sort((left, right) => {
      const dateComparison = right.dateWatched.localeCompare(left.dateWatched)

      if (dateComparison !== 0) {
        return dateComparison
      }

      return right.metadata.dateLogged.localeCompare(left.metadata.dateLogged)
    })

    const groupsByTmdbId = new Map<string, FilmEntry[]>()

    for (const film of sortedFilms) {
      const tmdbId = film.metadata.tmdb?.id

      if (tmdbId === null || tmdbId === undefined) {
        continue
      }

      const key = `tmdb:${tmdbId}`
      const existing = groupsByTmdbId.get(key) ?? []
      groupsByTmdbId.set(key, [...existing, film])
    }

    const filmsForAverages = sortedFilms.filter((film) => {
      const tmdbId = film.metadata.tmdb?.id

      if (tmdbId === null || tmdbId === undefined) {
        return true
      }

      const key = `tmdb:${tmdbId}`
      const grouped = groupsByTmdbId.get(key)

      return grouped?.[0]?.id === film.id
    })

    const ratedFilms = filmsForAverages.filter((film) => film.rating !== null)
    const averageRating = ratedFilms.length
      ? ratedFilms.reduce((sum, film) => sum + (film.rating ?? 0), 0) / ratedFilms.length
      : null

    const ratingDistribution = ratingBuckets.map((rating) => ({
      rating,
      count: ratedFilms.filter((film) => film.rating === rating).length,
    }))
    const maxRatingCount = Math.max(
      ...ratingDistribution.map((bucket) => bucket.count),
      0,
    )

    const tagTotals = new Map<string, { total: number; count: number }>()

    for (const film of ratedFilms) {
      for (const tag of film.tags) {
        const previous = tagTotals.get(tag) ?? { total: 0, count: 0 }
        tagTotals.set(tag, {
          total: previous.total + (film.rating ?? 0),
          count: previous.count + 1,
        })
      }
    }

    const topTagsByAverageRating = [...tagTotals.entries()]
      .map(([tag, totals]) => ({
        tag,
        averageRating: totals.total / totals.count,
        appearances: totals.count,
      }))
      .sort((left, right) => right.averageRating - left.averageRating || right.appearances - left.appearances)
      .slice(0, 5)

    const firstWatchCount = scopedFilms.filter((film) => film.metadata.firstWatch === true).length

    const rewatchGroups = [...groupsByTmdbId.values()].filter((logs) => logs.length > 1)

    const firstWatchAverageTotals: RewatchAggregate = { total: 0, count: 0 }
    const allWatchAverageTotals: RewatchAggregate = { total: 0, count: 0 }

    for (const logs of rewatchGroups) {
      const firstWatchLog = logs.find((log) => log.metadata.firstWatch === true && log.rating !== null)

      if (firstWatchLog?.rating !== null && firstWatchLog?.rating !== undefined) {
        firstWatchAverageTotals.total += firstWatchLog.rating
        firstWatchAverageTotals.count += 1
      }

      for (const log of logs) {
        if (log.rating !== null) {
          allWatchAverageTotals.total += log.rating
          allWatchAverageTotals.count += 1
        }
      }
    }

    const rewatchStats = {
      filmsWithRewatches: rewatchGroups.length,
      averageFirstWatch:
        firstWatchAverageTotals.count > 0
          ? firstWatchAverageTotals.total / firstWatchAverageTotals.count
          : null,
      averageAllWatches:
        allWatchAverageTotals.count > 0
          ? allWatchAverageTotals.total / allWatchAverageTotals.count
          : null,
    }

    return {
      totalFilmsLogged: scopedFilms.length,
      firstWatchCount,
      averageRating,
      ratingDistribution,
      maxRatingCount,
      ratedCount: ratedFilms.length,
      topTagsByAverageRating,
      rewatchStats,
    }
  }, [scopedFilms])

  const histogramSummary = useMemo(() => {
    if (!insights.ratedCount) return ''
    const peak = insights.ratingDistribution.reduce((best, bucket) =>
      bucket.count > best.count ? bucket : best,
    insights.ratingDistribution[0])
    return `Rating distribution across ${insights.ratedCount} rated films, peaking at ${peak.rating.toFixed(1)} with ${peak.count} films.`
  }, [insights])

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
            <span className="meta-pill meta-pill--soft">{periodLabel(period, customRange)}</span>
          ) : null}
        </div>
      </header>

      {publicError ? <p className="alert alert--error" role="alert">{publicError}</p> : null}

      {isLoading ? (
        <div className="shell-grid" aria-busy="true" aria-label="Loading insights">
          <div className="skeleton-card" />
          <div className="skeleton-card" />
          <div className="skeleton-card" />
          <div className="skeleton-card" />
        </div>
      ) : (
        <div className="shell-grid">
          <section className="shell-card">
            <h3>Film totals</h3>
            <ul className="insight-list">
              <li>Total films logged: {insights.totalFilmsLogged}</li>
              <li>First watches: {insights.firstWatchCount}</li>
            </ul>
          </section>

          <section className="shell-card">
            <h3>Average rating</h3>
            <p className="page__copy">
              {insights.averageRating === null
                ? 'No ratings yet — log a rating on any film to see your average.'
                : `${insights.averageRating.toFixed(1)} / 5`}
            </p>
          </section>

          <section className="shell-card">
            <h3>Rating distribution</h3>
            {insights.ratingDistribution.some((bucket) => bucket.count > 0) ? (
              <>
                <p className="meta">
                  Films per rating &middot; {insights.ratedCount} rated
                </p>
                <div
                  className="rating-histogram"
                  role="img"
                  aria-label={histogramSummary}
                >
                  {insights.ratingDistribution.map((bucket) => {
                    const isMinor = (bucket.rating * 10) % 10 !== 0
                    return (
                      <div
                        className="rating-histogram__bar"
                        key={bucket.rating}
                        aria-hidden="true"
                        title={`${bucket.count} film${bucket.count === 1 ? '' : 's'} at ${bucket.rating.toFixed(1)}`}
                      >
                        <span
                          className="rating-histogram__fill"
                          style={{
                            height: insights.maxRatingCount
                              ? `${Math.max((bucket.count / insights.maxRatingCount) * 100, bucket.count > 0 ? 12 : 0)}%`
                              : '0%',
                          }}
                        />
                        <span
                          className="rating-histogram__label"
                          data-minor={isMinor ? 'true' : undefined}
                        >
                          {bucket.rating.toFixed(1)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </>
            ) : (
              <p className="page__copy">
                No rated films yet. Log a rating on any film to see this chart fill in.
              </p>
            )}
          </section>

          <section className="shell-card">
            <h3>Rewatch stats</h3>
            {insights.rewatchStats.filmsWithRewatches ? (
              <>
                <ul className="insight-list">
                  <li>Films logged multiple times: {insights.rewatchStats.filmsWithRewatches}</li>
                  <li>Average first watch: {insights.rewatchStats.averageFirstWatch === null ? 'N/A' : `${insights.rewatchStats.averageFirstWatch.toFixed(1)} / 5`}</li>
                  <li>Average of all watches: {insights.rewatchStats.averageAllWatches === null ? 'N/A' : `${insights.rewatchStats.averageAllWatches.toFixed(1)} / 5`}</li>
                </ul>
                <details className="field__hint-details">
                  <summary>What's the difference?</summary>
                  <p>
                    <em>First watch</em> averages only the log marked as the first viewing of each film.{' '}
                    <em>All watches</em> averages every log of every film &mdash; rewatches included &mdash; so it shifts as opinions settle.
                  </p>
                </details>
              </>
            ) : (
              <p className="page__copy">No rewatches with high-confidence TMDb matches yet.</p>
            )}
          </section>

          <section className="shell-card">
            <h3>Top tags by average rating</h3>
            {insights.topTagsByAverageRating.length ? (
              <ol className="insight-list">
                {insights.topTagsByAverageRating.map((item) => (
                  <li key={item.tag}>
                    {formatFilmTag(item.tag)}: <strong>{item.averageRating.toFixed(1)}</strong>{' '}
                    <span className="meta-pill meta-pill--soft">{item.appearances} rated</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="page__copy">More tag patterns will appear as more films are logged.</p>
            )}
          </section>
        </div>
      )}

      <aside className="page__footnote">
        All averages use the most recent log for each film when it has been logged multiple times.
      </aside>
    </section>
  )
}
