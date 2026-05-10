import type { RatingBucket } from '../../utils/insights'

type RatingHistogramProps = {
  buckets: RatingBucket[]
  ratedCount: number
}

export function RatingHistogram({ buckets, ratedCount }: RatingHistogramProps) {
  const max = buckets.reduce((best, bucket) => Math.max(best, bucket.count), 0)
  const peak = buckets.reduce((best, bucket) => (bucket.count > best.count ? bucket : best), buckets[0])
  const summary = ratedCount
    ? `Rating distribution across ${ratedCount} rated films, peaking at ${peak.rating.toFixed(1)} with ${peak.count} films.`
    : 'No ratings yet.'

  return (
    <figure className="insights-card insights-card--wide">
      <figcaption className="insights-card__heading">
        <h3>Rating distribution</h3>
        <p className="meta">{summary}</p>
      </figcaption>
      {ratedCount === 0 ? (
        <p className="page__copy">Log a rating on any film to see this chart fill in.</p>
      ) : (
        <div className="rating-histogram rating-histogram--feature" role="img" aria-label={summary}>
          {buckets.map((bucket) => {
            const isMinor = (bucket.rating * 10) % 10 !== 0
            const isPeak = max > 0 && bucket.count === max
            const heightPct = max
              ? Math.max((bucket.count / max) * 100, bucket.count > 0 ? 12 : 0)
              : 0
            return (
              <div
                className="rating-histogram__bar"
                key={bucket.rating}
                aria-hidden="true"
                title={`${bucket.count} film${bucket.count === 1 ? '' : 's'} at ${bucket.rating.toFixed(1)}`}
              >
                <span
                  className="rating-histogram__count"
                  data-empty={bucket.count === 0 ? 'true' : undefined}
                >
                  {bucket.count}
                </span>
                <span
                  className="rating-histogram__fill"
                  data-peak={isPeak ? 'true' : undefined}
                  style={{ height: `${heightPct}%` }}
                />
                <span className="rating-histogram__label" data-minor={isMinor ? 'true' : undefined}>
                  {bucket.rating.toFixed(1)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </figure>
  )
}
