import {
  formatOwnedMedia,
  formatWatchContext,
  formatFilmTag,
} from '../config/filmOptions'
import { useFilms } from '../hooks/useFilms'

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
  }).format(new Date(`${value}T00:00:00`))

export function PublicPreviewPage() {
  const { films, isLoading } = useFilms()
  const publicFilms = films.filter((film) => film.isPublic)

  return (
    <section className="page">
      <header className="page__hero">
        <span className="eyebrow">Public preview</span>
        <h2 className="page__title">How your shared profile will look to visitors.</h2>
        <p className="page__copy">
          This local preview only shows films you marked as public. The hosted
          route will later live at <code>/v/:userId</code>.
        </p>
      </header>

      {isLoading ? <p className="empty-state">Loading public films...</p> : null}

      {!isLoading && publicFilms.length === 0 ? (
        <div className="placeholder-card">
          <strong>No public films yet.</strong>
          <p className="empty-state">
            Mark films as public in your log to preview your shared profile.
          </p>
        </div>
      ) : null}

      {!isLoading && publicFilms.length > 0 ? (
        <div className="film-list">
          {publicFilms.map((film) => (
            <article className="film-card" key={film.id}>
              <header className="film-card__header">
                <div>
                  <h3 className="film-card__title">{film.title}</h3>
                  <p className="meta">
                    {film.releaseYear ? `${film.releaseYear} • ` : ''}
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

              <div className="meta-row">
                {film.metadata.watchContext ? (
                  <span className="meta-pill">
                    {formatWatchContext(film.metadata.watchContext)}
                  </span>
                ) : null}
                {film.metadata.ownedFormats.map((format) => (
                  <span className="meta-pill" key={format}>
                    {formatOwnedMedia(format)}
                  </span>
                ))}
                {film.metadata.onWishlist ? (
                  <span className="meta-pill meta-pill--accent">Wishlist</span>
                ) : null}
              </div>

              {film.metadata.watchContextNote ? (
                <p className="meta">{film.metadata.watchContextNote}</p>
              ) : null}
              {film.notes ? <p className="film-card__notes">{film.notes}</p> : null}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  )
}
