import { useEffect, useMemo, useState } from 'react'
import { FilmCard } from '../components/FilmCard'
import { FilmFilters, type FilmFiltersState } from '../components/FilmFilters'
import { fetchPublicFilmEntries } from '../services/publicFilmProfileService'
import type { FilmEntry } from '../types/film'

const defaultFilters: FilmFiltersState = {
  titleQuery: '',
  releaseYearQuery: '',
  directorQuery: '',
  tagQuery: '',
  minimumRating: '',
  watchContext: '',
}

export function PublicPreviewPage() {
  const [films, setFilms] = useState<FilmEntry[]>([])
  const [filters, setFilters] = useState<FilmFiltersState>(defaultFilters)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const filteredFilms = useMemo(() => {
    const minimumRating = filters.minimumRating ? Number(filters.minimumRating) : null
    const titleQuery = filters.titleQuery.trim().toLowerCase()
    const yearQuery = filters.releaseYearQuery.trim()
    const tagQuery = filters.tagQuery.trim().toLowerCase()

    return films.filter((film) => {
      if (titleQuery && !film.title.toLowerCase().includes(titleQuery)) return false
      if (yearQuery && String(film.releaseYear ?? '').trim() !== yearQuery) return false
      if (tagQuery && !film.tags.some((tag) => tag.toLowerCase().includes(tagQuery))) return false
      if (minimumRating !== null && (film.rating === null || film.rating < minimumRating)) return false
      if (filters.watchContext && film.metadata.watchContext !== filters.watchContext) return false
      return true
    })
  }, [films, filters])

  useEffect(() => {
    let isMounted = true

    const loadPublicFilms = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const nextFilms = await fetchPublicFilmEntries()

        if (isMounted) {
          setFilms(nextFilms)
        }
      } catch (loadError) {
        console.error(loadError)

        if (isMounted) {
          setError('We could not load the film diary right now.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadPublicFilms()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <section className="page">
      <header className="page__hero">
        <span className="eyebrow">Film diary</span>
        <h2 className="page__title">Here&apos;s what I&apos;ve logged recently.</h2>
        <p className="page__copy">
          Browse recent watches, ratings, and notes. Looking for something to
          watch? Start here.
        </p>
        <div className="diary-filters">
          <FilmFilters filters={filters} onChange={setFilters} compact />
          <p className="meta">Showing {filteredFilms.length} of {films.length} films.</p>
        </div>
      </header>

      {isLoading ? <p className="empty-state">Loading recent watches...</p> : null}
      {error ? <p className="empty-state">{error}</p> : null}

      {!isLoading && !error && films.length === 0 ? (
        <div className="placeholder-card">
          <strong>No public films yet.</strong>
          <p className="empty-state">
            Check back soon for recent watches, ratings, and notes.
          </p>
        </div>
      ) : null}

      {!isLoading && !error && films.length > 0 && filteredFilms.length === 0 ? (
        <div className="placeholder-card">
          <strong>No matches yet.</strong>
          <p className="empty-state">Try a broader search or clear one of the filters.</p>
        </div>
      ) : null}

      {!isLoading && !error && filteredFilms.length > 0 ? (
        <div className="film-list">
          {filteredFilms.map((film) => (
            <FilmCard key={film.id} film={film} />
          ))}
        </div>
      ) : null}
    </section>
  )
}
