import { useEffect, useMemo, useState } from 'react'
import { FilmCard } from '../components/FilmCard'
import { FilmFilters, type FilmFiltersState } from '../components/FilmFilters'
import { fetchPublicFilmEntries } from '../services/publicFilmProfileService'
import type { FilmEntry, WatchContext } from '../types/film'

const defaultFilters: FilmFiltersState = {
  titleQuery: '',
  releaseYearQuery: '',
  directorQuery: '',
  tagQuery: '',
  minimumRating: '',
  watchContext: '',
  sort: 'recent',
}

const isDefaultFilters = (filters: FilmFiltersState) =>
  filters.titleQuery === defaultFilters.titleQuery &&
  filters.releaseYearQuery === defaultFilters.releaseYearQuery &&
  filters.directorQuery === defaultFilters.directorQuery &&
  filters.tagQuery === defaultFilters.tagQuery &&
  filters.minimumRating === defaultFilters.minimumRating &&
  filters.watchContext === defaultFilters.watchContext &&
  filters.sort === defaultFilters.sort

const getDirector = (film: FilmEntry) =>
  film.tmdbMetadata?.director ?? film.metadata.tmdb?.director ?? ''

export function PublicPreviewPage() {
  const [films, setFilms] = useState<FilmEntry[]>([])
  const [filters, setFilters] = useState<FilmFiltersState>(defaultFilters)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const availableTags = useMemo(() => {
    const tags = new Set<string>()
    for (const film of films) {
      for (const tag of film.tags) {
        tags.add(tag)
      }
    }
    return [...tags].sort((left, right) => left.localeCompare(right))
  }, [films])

  const availableWatchContexts = useMemo(() => {
    const contexts = new Set<WatchContext>()
    for (const film of films) {
      const context = film.metadata.watchContext
      if (context) {
        contexts.add(context)
      }
    }
    return [...contexts]
  }, [films])

  const filteredFilms = useMemo(() => {
    const minimumRating = filters.minimumRating ? Number(filters.minimumRating) : null
    const titleQuery = filters.titleQuery.trim().toLowerCase()
    const yearQuery = filters.releaseYearQuery.trim()
    const tagQuery = filters.tagQuery
    const directorQuery = filters.directorQuery.trim().toLowerCase()

    const matched = films.filter((film) => {
      if (titleQuery && !film.title.toLowerCase().includes(titleQuery)) return false
      if (yearQuery && String(film.releaseYear ?? '').trim() !== yearQuery) return false
      if (tagQuery && !film.tags.includes(tagQuery)) return false
      if (directorQuery && !getDirector(film).toLowerCase().includes(directorQuery)) return false
      if (minimumRating !== null && (film.rating === null || film.rating < minimumRating)) return false
      if (filters.watchContext && film.metadata.watchContext !== filters.watchContext) return false
      return true
    })

    return [...matched].sort((left, right) => {
      switch (filters.sort) {
        case 'rating-high':
          return (right.rating ?? -Infinity) - (left.rating ?? -Infinity)
        case 'oldest':
          return left.dateWatched.localeCompare(right.dateWatched)
        case 'recent':
        default:
          return right.dateWatched.localeCompare(left.dateWatched)
      }
    })
  }, [films, filters])

  const filtersAreDefault = isDefaultFilters(filters)
  const resetFilters = () => setFilters(defaultFilters)

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
      } catch {
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
        <span className="eyebrow">Film Diary</span>
        <h2 className="page__title">My film diary.</h2>
        <p className="page__copy">
          Recent watches, ratings, and notes from films I&rsquo;ve been meaning
          to track &mdash; looking for something to watch? Start here.
        </p>
        <div className="diary-filters">
          <FilmFilters
            filters={filters}
            onChange={setFilters}
            compact
            className="filter-grid--six-up"
            availableTags={availableTags}
            availableWatchContexts={availableWatchContexts}
          />
          <div className="filter-summary">
            <p className="meta">
              {filteredFilms.length} of {films.length} films
            </p>
            <button
              className="button-secondary"
              type="button"
              onClick={resetFilters}
              disabled={filtersAreDefault}
            >
              Reset filters
            </button>
          </div>
        </div>
      </header>

      {isLoading ? (
        <div className="skeleton-list" aria-busy="true" aria-label="Loading recent watches">
          <div className="skeleton-card skeleton-card--card" />
          <div className="skeleton-card skeleton-card--card" />
          <div className="skeleton-card skeleton-card--card" />
        </div>
      ) : null}
      {error ? <p className="alert alert--error" role="alert">{error}</p> : null}

      {!isLoading && !error && films.length === 0 ? (
        <div className="placeholder-card">
          <strong>No public films yet.</strong>
          <p className="empty-state">
            Check back soon for recent watches, ratings, and notes.
          </p>
        </div>
      ) : null}

      {!isLoading && !error && films.length > 0 && filteredFilms.length === 0 ? (
        <div className="placeholder-card placeholder-card--warning" role="status">
          <strong>No matches.</strong>
          <p className="empty-state">Your current filters return zero films.</p>
          <button className="button-secondary" type="button" onClick={resetFilters}>
            Reset filters
          </button>
        </div>
      ) : null}

      {!isLoading && !error && filteredFilms.length > 0 ? (
        <div className="film-list">
          {filteredFilms.map((film) => (
            <FilmCard key={film.id} film={film} showLink />
          ))}
        </div>
      ) : null}
    </section>
  )
}
