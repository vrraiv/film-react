import type { DayOfWeekBucket, MonthBucket } from '../../utils/insights'

type WatchPatternBarsProps = {
  months: MonthBucket[]
  daysOfWeek: DayOfWeekBucket[]
}

type Bucket = { label: string; count: number; isPeak?: boolean }

const renderBars = (buckets: Bucket[], ariaLabel: string) => {
  const max = buckets.reduce((best, bucket) => Math.max(best, bucket.count), 0)
  return (
    <div className="pattern-bars" role="img" aria-label={ariaLabel}>
      {buckets.map((bucket) => {
        const heightPct = max ? Math.max((bucket.count / max) * 100, bucket.count > 0 ? 8 : 0) : 0
        return (
          <div className="pattern-bars__col" key={bucket.label} title={`${bucket.label}: ${bucket.count}`}>
            <span className="pattern-bars__count">{bucket.count}</span>
            <span
              className="pattern-bars__fill"
              data-peak={bucket.isPeak ? 'true' : undefined}
              style={{ height: `${heightPct}%` }}
            />
            <span className="pattern-bars__label">{bucket.label}</span>
          </div>
        )
      })}
    </div>
  )
}

const markPeak = (buckets: { label: string; count: number }[]): Bucket[] => {
  const max = buckets.reduce((best, bucket) => Math.max(best, bucket.count), 0)
  return buckets.map((bucket) => ({ ...bucket, isPeak: max > 0 && bucket.count === max }))
}

export function WatchPatternBars({ months, daysOfWeek }: WatchPatternBarsProps) {
  const monthBuckets = markPeak(months.map(({ label, count }) => ({ label, count })))
  const dayBuckets = markPeak(daysOfWeek.map(({ label, count }) => ({ label, count })))
  const totalMonth = months.reduce((sum, bucket) => sum + bucket.count, 0)

  return (
    <figure className="insights-card insights-card--wide">
      <figcaption className="insights-card__heading">
        <h3>When I watch</h3>
        <p className="meta">{totalMonth} watch{totalMonth === 1 ? '' : 'es'} across the months and weekdays in scope.</p>
      </figcaption>
      <div className="pattern-grid">
        <div className="pattern-grid__col">
          <h4 className="pattern-grid__title">By month</h4>
          {renderBars(monthBuckets, 'Watches per month of the year')}
        </div>
        <div className="pattern-grid__col">
          <h4 className="pattern-grid__title">By day of week</h4>
          {renderBars(dayBuckets, 'Watches per day of the week')}
        </div>
      </div>
    </figure>
  )
}
