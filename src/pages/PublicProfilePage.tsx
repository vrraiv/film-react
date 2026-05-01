import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { formatFilmTag } from '../config/filmOptions'
import {
  fetchPublicFilmProfile,
  type PublicFilmProfile,
} from '../services/publicFilmProfileService'

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
  }).format(new Date(`${value}T00:00:00`))

export function PublicProfilePage() {
  const { userId } = useParams()
  const [profile, setProfile] = useState<PublicFilmProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadProfile = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const nextProfile = await fetchPublicFilmProfile(userId ?? '')

        if (isMounted) {
          setProfile(nextProfile)
        }
      } catch (profileError) {
        console.error(profileError)

        if (isMounted) {
          setError('We could not load this public film diary.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadProfile()

    return () => {
      isMounted = false
    }
  }, [userId])

  if (isLoading) {
    return <p className="empty-state">Loading public film diary...</p>
  }

  if (error) {
    return <p className="empty-state">{error}</p>
  }

  if (!profile) {
    return (
      <section className="page">
        <header className="page__hero">
          <span className="eyebrow">Public view</span>
          <h2 className="page__title">This film diary is not available.</h2>
          <p className="page__copy">
            The profile may be private, unpublished, or using a different link.
          </p>
        </header>
      </section>
    )
  }

  return (
    <section className="page">
      <header className="page__hero">
        <span className="eyebrow">Public diary</span>
        <h2 className="page__title">{profile.displayName}'s film diary</h2>
        <p className="page__copy">
          Selected ratings and notes shared from @{profile.username}.
        </p>
      </header>

      {profile.entries.length === 0 ? (
        <div className="placeholder-card">
          <strong>No public films yet.</strong>
          <p className="empty-state">
            This profile is public, but no entries have been shared.
          </p>
        </div>
      ) : (
        <div className="film-list">
          {profile.entries.map((film) => (
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
      )}
    </section>
  )
}
