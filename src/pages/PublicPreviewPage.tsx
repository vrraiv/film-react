import { useEffect, useState } from 'react'
import { formatFilmTag } from '../config/filmOptions'
import { fetchPublicFilmEntries } from '../services/publicFilmProfileService'
import type { FilmEntry } from '../types/film'

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
  }).format(new Date(`${value}T00:00:00`))

export function PublicPreviewPage() {
  const [films, setFilms] = useState<FilmEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

      {!isLoading && !error && films.length > 0 ? (
        <div className="film-list">
          {films.map((film) => (
            <article className="film-card" key={film.id}>
              <header className="film-card__header">
                <div>
                  <h3 className="film-card__title">{film.title}</h3>
                  <p className="meta">
                    {film.releaseYear ? `${film.releaseYear} - ` : ''}
                    {formatDate(film.dateWatched)}
                  </p>
                </div>
                <span className="film-card__rating">
                  {film.rating === null ? 'Unrated' : `${film.rating.toFixed(1)} / 5`}
                </span>
              </header>

              {film.tags.length > 0 ? (
                <div className="tag-row">
                  {film.tags.map((tag) => (
                    <span className="tag-chip tag-chip--static" key={tag}>
                      {formatFilmTag(tag)}
                    </span>
                  ))}
                </div>
              ) : null}

              {film.notes ? <p className="film-card__notes">{film.notes}</p> : null}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  )
}
