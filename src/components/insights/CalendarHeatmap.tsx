import type { CalendarCell } from '../../utils/insights'

type CalendarHeatmapProps = {
  cells: CalendarCell[]
  max: number
  start: string
  end: string
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const CELL = 12
const GAP = 3
const TOP_PAD = 14
const LEFT_PAD = 22

const intensityClass = (count: number, max: number): string => {
  if (count === 0 || max === 0) return 'cal-cell cal-cell--0'
  const ratio = count / max
  if (ratio > 0.75) return 'cal-cell cal-cell--4'
  if (ratio > 0.5) return 'cal-cell cal-cell--3'
  if (ratio > 0.25) return 'cal-cell cal-cell--2'
  return 'cal-cell cal-cell--1'
}

export function CalendarHeatmap({ cells, max, start, end }: CalendarHeatmapProps) {
  const weeks: CalendarCell[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7))
  }
  const width = LEFT_PAD + weeks.length * (CELL + GAP)
  const height = TOP_PAD + 7 * (CELL + GAP)

  const monthLabels: Array<{ x: number; label: string }> = []
  let lastMonth = -1
  weeks.forEach((week, weekIndex) => {
    const first = week[0]
    if (!first) return
    const month = new Date(`${first.date}T00:00:00`).getMonth()
    if (month !== lastMonth) {
      monthLabels.push({ x: LEFT_PAD + weekIndex * (CELL + GAP), label: MONTH_NAMES[month] })
      lastMonth = month
    }
  })

  const totalLogged = cells.reduce((sum, cell) => sum + cell.count, 0)

  return (
    <figure className="insights-card insights-card--wide">
      <figcaption className="insights-card__heading">
        <h3>Calendar</h3>
        <p className="meta">
          {totalLogged} watch{totalLogged === 1 ? '' : 'es'} between {start} and {end}
        </p>
      </figcaption>
      <div className="cal-scroll">
        <svg
          className="cal-svg"
          viewBox={`0 0 ${width} ${height}`}
          width={width}
          height={height}
          role="img"
          aria-label={`Calendar heatmap showing ${totalLogged} films logged between ${start} and ${end}`}
        >
          {monthLabels.map((m) => (
            <text key={`${m.x}-${m.label}`} x={m.x} y={TOP_PAD - 4} className="cal-month">
              {m.label}
            </text>
          ))}
          {weeks.map((week, weekIndex) =>
            week.map((cell, dayIndex) => (
              <rect
                key={cell.date}
                x={LEFT_PAD + weekIndex * (CELL + GAP)}
                y={TOP_PAD + dayIndex * (CELL + GAP)}
                width={CELL}
                height={CELL}
                rx={2}
                className={intensityClass(cell.count, max)}
              >
                <title>{`${cell.date}: ${cell.count} film${cell.count === 1 ? '' : 's'}`}</title>
              </rect>
            )),
          )}
        </svg>
      </div>
      <div className="cal-legend" aria-hidden="true">
        <span className="meta">Less</span>
        {[0, 1, 2, 3, 4].map((step) => (
          <span key={step} className={`cal-cell cal-cell--${step} cal-legend__swatch`} />
        ))}
        <span className="meta">More</span>
      </div>
    </figure>
  )
}
