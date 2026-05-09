import type { RuntimeBucket } from '../../utils/insights'

type RuntimeHistogramProps = {
  buckets: RuntimeBucket[]
}

export function RuntimeHistogram({ buckets }: RuntimeHistogramProps) {
  const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0)
  const max = buckets.reduce((best, bucket) => Math.max(best, bucket.count), 0)

  if (total === 0) {
    return (
      <figure className="insights-card">
        <figcaption className="insights-card__heading">
          <h3>Runtime</h3>
        </figcaption>
        <p className="page__copy">Runtime data appears once films are matched to TMDb.</p>
      </figure>
    )
  }

  return (
    <figure className="insights-card">
      <figcaption className="insights-card__heading">
        <h3>Runtime</h3>
        <p className="meta">{total} films with TMDb runtimes (minutes).</p>
      </figcaption>
      <div className="pattern-bars" role="img" aria-label="Films grouped by runtime in minutes">
        {buckets.map((bucket) => {
          const heightPct = max ? Math.max((bucket.count / max) * 100, bucket.count > 0 ? 8 : 0) : 0
          return (
            <div className="pattern-bars__col" key={bucket.label} title={`${bucket.label}: ${bucket.count}`}>
              <span className="pattern-bars__count">{bucket.count}</span>
              <span className="pattern-bars__fill" style={{ height: `${heightPct}%` }} />
              <span className="pattern-bars__label">{bucket.label}</span>
            </div>
          )
        })}
      </div>
    </figure>
  )
}
