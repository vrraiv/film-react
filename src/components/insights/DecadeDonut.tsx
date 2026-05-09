import type { DecadeBucket } from '../../utils/insights'

type DecadeDonutProps = {
  buckets: DecadeBucket[]
}

const SIZE = 160
const RADIUS = 64
const STROKE = 22
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const PALETTE = [
  '#b33b2e',
  '#d77a3a',
  '#c8a039',
  '#6e8a3a',
  '#3f7a64',
  '#3a6e8a',
  '#564b87',
  '#7a3a6e',
  '#8a4a3a',
  '#5a4a3a',
]

export function DecadeDonut({ buckets }: DecadeDonutProps) {
  const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0)
  if (total === 0) {
    return (
      <figure className="insights-card">
        <figcaption className="insights-card__heading">
          <h3>By decade</h3>
        </figcaption>
        <p className="page__copy">Match a few films on TMDb to see your decade mix.</p>
      </figure>
    )
  }

  const segments: Array<{
    key: number
    label: string
    count: number
    averageRating: number | null
    color: string
    dash: string
    dashOffset: number
    fraction: number
  }> = []
  let offset = 0
  for (let index = 0; index < buckets.length; index += 1) {
    const bucket = buckets[index]
    const fraction = bucket.count / total
    const length = fraction * CIRCUMFERENCE
    segments.push({
      key: bucket.decade,
      label: bucket.label,
      count: bucket.count,
      averageRating: bucket.averageRating,
      color: PALETTE[index % PALETTE.length],
      dash: `${length} ${CIRCUMFERENCE - length}`,
      dashOffset: -offset,
      fraction,
    })
    offset += length
  }

  const top = [...buckets].sort((a, b) => b.count - a.count)[0]

  return (
    <figure className="insights-card">
      <figcaption className="insights-card__heading">
        <h3>By decade</h3>
        <p className="meta">{total} films placed by release year.</p>
      </figcaption>
      <div className="donut-row">
        <svg
          className="donut-svg"
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          width={SIZE}
          height={SIZE}
          role="img"
          aria-label={`Decade breakdown across ${total} films`}
        >
          <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} className="donut-track" strokeWidth={STROKE} />
          {segments.map((segment) => (
            <circle
              key={segment.key}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={segment.color}
              strokeWidth={STROKE}
              strokeDasharray={segment.dash}
              strokeDashoffset={segment.dashOffset}
              transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
            >
              <title>{`${segment.label}: ${segment.count} (${Math.round(segment.fraction * 100)}%)`}</title>
            </circle>
          ))}
          <text x={SIZE / 2} y={SIZE / 2 - 4} textAnchor="middle" className="donut-center">
            {top.label}
          </text>
          <text x={SIZE / 2} y={SIZE / 2 + 14} textAnchor="middle" className="donut-center-sub">
            top decade
          </text>
        </svg>
        <ul className="donut-legend">
          {segments.map((segment) => (
            <li key={segment.key}>
              <span className="donut-legend__swatch" style={{ background: segment.color }} aria-hidden="true" />
              <span className="donut-legend__label">{segment.label}</span>
              <span className="donut-legend__count">{segment.count}</span>
            </li>
          ))}
        </ul>
      </div>
    </figure>
  )
}
