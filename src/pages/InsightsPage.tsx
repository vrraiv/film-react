import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { formatFilmTag } from '../config/filmOptions'
import { RATING_OPTIONS } from '../config/filmTags'
import { useFilms } from '../hooks/useFilms'
import { fetchPublicFilmEntries } from '../services/publicFilmProfileService'
import type { FilmEntry } from '../types/film'

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
  const films = user ? privateFilms : publicFilms
  const isLoading = user ? isLoadingPrivateFilms : authLoading || isLoadingPublicFilms

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
      } catch (loadError) {
        console.error(loadError)

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
    const ratedFilms = films.filter((film) => film.rating !== null)
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

    return {
      totalFilms: films.length,
      averageRating,
      ratingDistribution,
      maxRatingCount,
      topTagsByAverageRating,
    }
  }, [films])

  return (
    <section className="page">
      <header className="page__hero">
        <span className="eyebrow">Insights</span>
        <h2 className="page__title">Insights from recent watches.</h2>
        <p className="page__copy">
          A quick look at what shows up most often in the shared film diary.
        </p>
      </header>

      {publicError ? <p className="empty-state">{publicError}</p> : null}

      <div className="shell-grid">
        <section className="shell-card">
          <h3>Total films</h3>
          <p className="page__copy">{isLoading ? 'Loading…' : insights.totalFilms.toString()}</p>
        </section>

        <section className="shell-card">
          <h3>Average rating</h3>
          <p className="page__copy">
            {isLoading
              ? 'Loading…'
              : insights.averageRating === null
                ? 'More insights will appear as more films are rated.'
                : `${insights.averageRating.toFixed(1)} / 5`}
          </p>
        </section>

        <section className="shell-card">
          <h3>Rating distribution</h3>
          {isLoading ? (
            <p className="page__copy">Loading…</p>
          ) : insights.ratingDistribution.some((bucket) => bucket.count > 0) ? (
            <>
              <ul className="insight-list">
                {insights.ratingDistribution.map((bucket) => (
                  <li key={bucket.rating}>
                    {bucket.rating.toFixed(1)} / 5: {bucket.count}
                  </li>
                ))}
              </ul>
              <div className="rating-histogram" aria-label="Rating histogram">
                {insights.ratingDistribution.map((bucket) => (
                  <div className="rating-histogram__bar" key={bucket.rating}>
                    <span
                      className="rating-histogram__fill"
                      style={{
                        height: insights.maxRatingCount
                          ? `${Math.max((bucket.count / insights.maxRatingCount) * 100, bucket.count > 0 ? 12 : 0)}%`
                          : '0%',
                      }}
                    />
                    <span className="rating-histogram__label">
                      {bucket.rating.toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="page__copy">More insights will appear as more films are rated.</p>
          )}
        </section>

        <section className="shell-card">
          <h3>Top tags by average rating</h3>
          {isLoading ? (
            <p className="page__copy">Loading…</p>
          ) : insights.topTagsByAverageRating.length ? (
            <ol>
              {insights.topTagsByAverageRating.map((item) => (
                <li key={item.tag}>
                  {formatFilmTag(item.tag)}: {item.averageRating.toFixed(1)} ({item.appearances} rated film{item.appearances === 1 ? '' : 's'})
                </li>
              ))}
            </ol>
          ) : (
            <p className="page__copy">More tag patterns will appear as more films are logged.</p>
          )}
        </section>
      </div>
    </section>
  )
}
