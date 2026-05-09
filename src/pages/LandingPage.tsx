import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FilmCard } from '../components/FilmCard'
import { buildPublicTasteBrowser } from '../features/tasteProfile/publicTasteBrowser'
import { fetchPublicFilmEntries } from '../services/publicFilmProfileService'
import type { FilmEntry } from '../types/film'

const RECENT_LIMIT = 3
const CANON_LIMIT = 3

const computeStats = (films: FilmEntry[]) => {
  const total = films.length
  const currentYear = new Date().getUTCFullYear()
  const thisYear = films.filter((film) => film.dateWatched.startsWith(String(currentYear))).length
  const ratedFilms = films.filter((film): film is FilmEntry & { rating: number } => film.rating !== null)
  const averageRating = ratedFilms.length > 0
    ? ratedFilms.reduce((sum, film) => sum + film.rating, 0) / ratedFilms.length
    : null
  return { total, thisYear, averageRating }
}

export function LandingPage() {
  const [films, setFilms] = useState<FilmEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const nextFilms = await fetchPublicFilmEntries()
        if (isMounted) setFilms(nextFilms)
      } catch {
        if (isMounted) setError('We could not load the diary right now.')
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    void load()
    return () => {
      isMounted = false
    }
  }, [])

  const stats = useMemo(() => computeStats(films), [films])

  const recentWatches = useMemo(() =>
    [...films]
      .sort((left, right) => right.dateWatched.localeCompare(left.dateWatched))
      .slice(0, RECENT_LIMIT),
  [films])

  const latestReview = useMemo(
    () => films.find((film) => film.notes.trim().length > 0) ?? null,
    [films],
  )

  const canonTop = useMemo(() => {
    if (films.length === 0) return []
    const browser = buildPublicTasteBrowser(films, { tagOrMood: '', runtimeBucket: 'all' })
    return browser.personalCanon.slice(0, CANON_LIMIT).map((entry) => entry.film)
  }, [films])

  return (
    <section className="page">
      <header className="page__hero">
        <span className="eyebrow">Welcome</span>
        <h2 className="page__title">A film diary, with notes.</h2>
        <p className="page__copy">
          Recent watches, ratings, and an experimental recommender &mdash; browse the diary, dig into shared picks, or
          peek at viewing patterns.
        </p>
        <div className="button-row">
          <Link className="button-primary" to="/diary">Browse the diary</Link>
          <Link className="button-secondary" to="/taste">See shared picks</Link>
          <Link className="button-secondary" to="/insights">Open insights</Link>
        </div>
      </header>

      {error ? <p className="alert alert--error" role="alert">{error}</p> : null}

      {isLoading ? (
        <div className="shell-grid" aria-busy="true" aria-label="Loading diary highlights">
          <div className="shell-card skeleton-card" />
          <div className="shell-card skeleton-card" />
          <div className="shell-card skeleton-card" />
        </div>
      ) : (
        <div className="shell-grid">
          <section className="shell-card">
            <h3>Films logged</h3>
            <p className="landing__stat-value">{stats.total}</p>
          </section>
          <section className="shell-card">
            <h3>This year</h3>
            <p className="landing__stat-value">{stats.thisYear}</p>
          </section>
          <section className="shell-card">
            <h3>Average rating</h3>
            <p className="landing__stat-value">
              {stats.averageRating !== null ? stats.averageRating.toFixed(1) : '—'}
              <span className="landing__stat-unit"> / 5</span>
            </p>
          </section>
        </div>
      )}

      {!isLoading && latestReview ? (
        <section className="panel">
          <header className="panel__header">
            <h3 className="panel__title">Latest review</h3>
            <p className="panel__subtitle">Most recent watch with notes.</p>
          </header>
          <FilmCard film={latestReview} showLink />
        </section>
      ) : null}

      {!isLoading && recentWatches.length > 0 ? (
        <section className="panel">
          <header className="panel__header">
            <h3 className="panel__title">Recent watches</h3>
            <p className="panel__subtitle">A glimpse of the latest entries.</p>
          </header>
          <div className="film-list">
            {recentWatches.map((film) => (
              <FilmCard key={film.id} film={film} showLink />
            ))}
          </div>
          <Link className="button-secondary" to="/diary">Open the full diary</Link>
        </section>
      ) : null}

      {!isLoading && canonTop.length > 0 ? (
        <section className="panel">
          <header className="panel__header">
            <h3 className="panel__title">Personal canon</h3>
            <p className="panel__subtitle">Highest-rated picks &mdash; more in shared picks.</p>
          </header>
          <div className="film-list">
            {canonTop.map((film) => (
              <FilmCard key={film.id} film={film} showLink />
            ))}
          </div>
          <Link className="button-secondary" to="/taste">Explore shared picks</Link>
        </section>
      ) : null}

      {!isLoading && films.length === 0 && !error ? (
        <div className="placeholder-card">
          <strong>No public films yet.</strong>
          <p className="empty-state">Check back soon for recent watches, ratings, and notes.</p>
        </div>
      ) : null}
    </section>
  )
}
