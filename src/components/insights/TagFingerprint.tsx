import type { TagCategoryStat } from '../../utils/insights'

type TagFingerprintProps = {
  stats: TagCategoryStat[]
}

const SIZE = 220
const CENTER = SIZE / 2
const RADIUS = 78
const RINGS = 4

const polarPoint = (axisIndex: number, axisCount: number, ratio: number) => {
  const angle = (-Math.PI / 2) + (axisIndex / axisCount) * Math.PI * 2
  const r = RADIUS * ratio
  return {
    x: CENTER + Math.cos(angle) * r,
    y: CENTER + Math.sin(angle) * r,
  }
}

export function TagFingerprint({ stats }: TagFingerprintProps) {
  const axisCount = stats.length
  const hasData = stats.some((stat) => stat.share > 0)

  if (!hasData) {
    return (
      <figure className="insights-card">
        <figcaption className="insights-card__heading">
          <h3>Tag fingerprint</h3>
        </figcaption>
        <p className="page__copy">Add tags to a few films to see your taste profile across categories.</p>
      </figure>
    )
  }

  const polygonPoints = stats
    .map((stat, index) => {
      const point = polarPoint(index, axisCount, stat.share)
      return `${point.x},${point.y}`
    })
    .join(' ')

  return (
    <figure className="insights-card">
      <figcaption className="insights-card__heading">
        <h3>Tag fingerprint</h3>
        <p className="meta">Share of films tagged in each category.</p>
      </figcaption>
      <div className="fingerprint-row">
        <svg
          className="fingerprint-svg"
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          width={SIZE}
          height={SIZE}
          role="img"
          aria-label="Radar showing how tags spread across the five categories"
        >
          {Array.from({ length: RINGS }).map((_, ringIndex) => {
            const ringRatio = (ringIndex + 1) / RINGS
            const ringPoints = stats
              .map((_stat, axisIndex) => {
                const point = polarPoint(axisIndex, axisCount, ringRatio)
                return `${point.x},${point.y}`
              })
              .join(' ')
            return (
              <polygon
                key={ringIndex}
                points={ringPoints}
                className="fingerprint-grid"
                strokeDasharray={ringIndex === RINGS - 1 ? undefined : '2 3'}
              />
            )
          })}
          {stats.map((_stat, axisIndex) => {
            const end = polarPoint(axisIndex, axisCount, 1)
            return (
              <line
                key={axisIndex}
                x1={CENTER}
                y1={CENTER}
                x2={end.x}
                y2={end.y}
                className="fingerprint-axis"
              />
            )
          })}
          <polygon points={polygonPoints} className="fingerprint-shape" />
          {stats.map((stat, axisIndex) => {
            const point = polarPoint(axisIndex, axisCount, stat.share)
            return <circle key={stat.categoryId} cx={point.x} cy={point.y} r={3.5} className="fingerprint-dot" />
          })}
        </svg>
        <ul className="fingerprint-legend">
          {stats.map((stat) => (
            <li key={stat.categoryId}>
              <div className="fingerprint-legend__row">
                <span className="fingerprint-legend__label">{stat.label}</span>
                <span className="fingerprint-legend__share">{Math.round(stat.share * 100)}%</span>
              </div>
              <p className="fingerprint-legend__top">
                {stat.topTag ? `Top: ${stat.topTag.label} (${stat.topTag.count})` : 'No tags yet'}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </figure>
  )
}
