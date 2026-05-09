type HeroStatsProps = {
  totalFilms: number
  averageRating: number | null
  ratedCount: number
  firstWatches: number
  thisYearCount: number
  monthsElapsed: number
  scopeLabel: string
}

const formatPace = (count: number, monthsElapsed: number): string => {
  if (count === 0 || monthsElapsed <= 0) return '—'
  const perMonth = count / monthsElapsed
  return perMonth >= 10 ? perMonth.toFixed(0) : perMonth.toFixed(1)
}

export function HeroStats({
  totalFilms,
  averageRating,
  ratedCount,
  firstWatches,
  thisYearCount,
  monthsElapsed,
  scopeLabel,
}: HeroStatsProps) {
  const stats = [
    {
      label: `Films · ${scopeLabel}`,
      value: totalFilms.toString(),
      caption: `${firstWatches} first watches`,
    },
    {
      label: 'Average rating',
      value: averageRating === null ? '—' : averageRating.toFixed(1),
      unit: averageRating === null ? null : '/ 5',
      caption: `${ratedCount} rated`,
    },
    {
      label: 'This year',
      value: thisYearCount.toString(),
      caption: `${formatPace(thisYearCount, monthsElapsed)} per month so far`,
    },
  ]

  return (
    <section className="insights-hero" aria-label="Headline stats">
      {stats.map((stat) => (
        <article key={stat.label} className="insights-hero__stat">
          <p className="insights-hero__value">
            {stat.value}
            {stat.unit ? <span className="insights-hero__unit"> {stat.unit}</span> : null}
          </p>
          <p className="insights-hero__label">{stat.label}</p>
          <p className="insights-hero__caption">{stat.caption}</p>
        </article>
      ))}
    </section>
  )
}
