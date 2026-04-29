import { useMemo, useState } from 'react'
import { FilmFilters, type FilmFiltersState } from '../components/FilmFilters'
import { FilmForm } from '../components/FilmForm'
import { FilmList } from '../components/FilmList'
import { useFilms } from '../hooks/useFilms'

const defaultFilters: FilmFiltersState = {
  selectedTag: '',
  minimumRating: '',
  watchContext: '',
}

export function LogPage() {
  const { films, isLoading, isSaving, error, lastSavedFilmId, addFilm } = useFilms()
  const [filters, setFilters] = useState<FilmFiltersState>(defaultFilters)
  const latestSavedFilm = films.find((film) => film.id === lastSavedFilmId)

  const filteredFilms = useMemo(() => {
    const minimumRating = filters.minimumRating
      ? Number(filters.minimumRating)
      : null

    return films.filter((film) => {
      if (filters.selectedTag && !film.tags.includes(filters.selectedTag)) {
        return false
      }

      if (minimumRating !== null && (film.rating === null || film.rating < minimumRating)) {
        return false
      }

      if (
        filters.watchContext &&
        film.metadata.watchContext !== filters.watchContext
      ) {
        return false
      }

      return true
    })
  }, [films, filters])

  return (
    <section className="page">
      <header className="page__hero">
        <span className="eyebrow">Log</span>
        <h2 className="page__title">Capture the essentials while the film is still fresh.</h2>
        <p className="page__copy">
          This first flow now separates taste tags from viewing metadata, so future
          recommendations can focus on what you love rather than where you watched it.
        </p>
      </header>

      <div className="log-grid">
        <section className="panel">
          <header className="panel__header">
            <h3 className="panel__title">New entry</h3>
            <p className="page__copy">
              Taste lives in the tag system. Practical details like watch context,
              ownership, and wishlist status stay separate.
            </p>
          </header>

          <FilmForm isSaving={isSaving} onSubmit={addFilm} />

          {error ? <p className="empty-state">{error}</p> : null}
          {latestSavedFilm ? (
            <p className="status-message">
              Saved "{latestSavedFilm.title}" to your local log.
            </p>
          ) : null}
        </section>

        <section className="panel">
          <header className="panel__header">
            <h3 className="panel__title">Recent films</h3>
            <p className="page__copy">
              Filter by taste tag, rating, or watch context without blending those
              non-taste details into the recommendation layer.
            </p>
          </header>

          <FilmFilters filters={filters} onChange={setFilters} />
          <p className="meta">
            Showing {filteredFilms.length} of {films.length} logged films.
          </p>

          <FilmList films={filteredFilms} isLoading={isLoading} />
        </section>
      </div>
    </section>
  )
}
