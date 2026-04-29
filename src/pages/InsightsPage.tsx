import { useMemo } from 'react'
import { formatFilmTag } from '../config/filmOptions'
import { useFilms } from '../hooks/useFilms'

const ratingBuckets = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

export function InsightsPage() {
  const { films, isLoading } = useFilms()

  const insights = useMemo(() => {
    const ratedFilms = films.filter((film) => film.rating !== null)
    const averageRating = ratedFilms.length
      ? ratedFilms.reduce((sum, film) => sum + (film.rating ?? 0), 0) / ratedFilms.length
      : null

    const ratingDistribution = ratingBuckets.map((rating) => ({
      rating,
      count: ratedFilms.filter((film) => film.rating === rating).length,
    }))

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
      topTagsByAverageRating,
    }
  }, [films])

  return (
    <section className="page">
      <header className="page__hero">
        <span className="eyebrow">Insights</span>
        <h2 className="page__title">See how your ratings and tags stack up.</h2>
        <p className="page__copy">
          These insights come from your local film log and stay useful even when you
          are just getting started.
        </p>
      </header>

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
                ? 'No ratings yet'
                : `${insights.averageRating.toFixed(1)} / 10`}
          </p>
        </section>

        <section className="shell-card">
          <h3>Rating distribution</h3>
          {isLoading ? (
            <p className="page__copy">Loading…</p>
          ) : insights.ratingDistribution.some((bucket) => bucket.count > 0) ? (
            <ul>
              {insights.ratingDistribution.map((bucket) => (
                <li key={bucket.rating}>
                  {bucket.rating}/10: {bucket.count}
                </li>
              ))}
            </ul>
          ) : (
            <p className="page__copy">No ratings yet.</p>
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
            <p className="page__copy">Add tagged ratings to see tag insights.</p>
          )}
        </section>
      </div>
    </section>
  )
}
