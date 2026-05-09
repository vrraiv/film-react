import type { DecadeRanking, DirectorStat, TopFilm } from '../../utils/insights'

type LeaderboardsProps = {
  topOfYear: TopFilm[]
  topDirectors: DirectorStat[]
  topDecades: DecadeRanking[]
  yearLabel: string
}

const ratingPill = (rating: number) => `${rating.toFixed(1)} / 5`

export function Leaderboards({ topOfYear, topDirectors, topDecades, yearLabel }: LeaderboardsProps) {
  return (
    <section className="leaderboards" aria-label="Leaderboards">
      <article className="insights-card">
        <header className="insights-card__heading">
          <h3>Top of {yearLabel}</h3>
          <p className="meta">Highest-rated films logged this year.</p>
        </header>
        {topOfYear.length === 0 ? (
          <p className="page__copy">No rated films logged for {yearLabel} yet.</p>
        ) : (
          <ol className="leaderboard-list">
            {topOfYear.map((film) => (
              <li key={film.id}>
                <span className="leaderboard-list__primary">
                  {film.title}
                  {film.year ? <span className="leaderboard-list__year"> ({film.year})</span> : null}
                </span>
                <span className="meta-pill meta-pill--soft">{ratingPill(film.rating)}</span>
              </li>
            ))}
          </ol>
        )}
      </article>

      <article className="insights-card">
        <header className="insights-card__heading">
          <h3>Top directors</h3>
          <p className="meta">Average rating across two or more films.</p>
        </header>
        {topDirectors.length === 0 ? (
          <p className="page__copy">Log a second film by any director to start a ranking.</p>
        ) : (
          <ol className="leaderboard-list">
            {topDirectors.map((stat) => (
              <li key={stat.director}>
                <span className="leaderboard-list__primary">{stat.director}</span>
                <span className="leaderboard-list__meta">
                  <strong>{stat.averageRating.toFixed(1)}</strong>
                  <span className="meta-pill meta-pill--soft">{stat.filmCount} films</span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </article>

      <article className="insights-card">
        <header className="insights-card__heading">
          <h3>Top decades</h3>
          <p className="meta">Average rating across two or more films per decade.</p>
        </header>
        {topDecades.length === 0 ? (
          <p className="page__copy">Match a few films on TMDb to see decade rankings.</p>
        ) : (
          <ol className="leaderboard-list">
            {topDecades.map((stat) => (
              <li key={stat.decade}>
                <span className="leaderboard-list__primary">{stat.label}</span>
                <span className="leaderboard-list__meta">
                  <strong>{stat.averageRating.toFixed(1)}</strong>
                  <span className="meta-pill meta-pill--soft">{stat.filmCount} films</span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </article>
    </section>
  )
}
