import {
  formatOwnedMedia,
  formatWatchContext,
  formatFilmTag,
} from '../config/filmOptions'
import type { FilmEntry } from '../types/film'

type FilmListProps = {
  films: FilmEntry[]
  isLoading: boolean
  onEdit: (film: FilmEntry) => void
  onDelete: (film: FilmEntry) => void
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
  }).format(new Date(`${value}T00:00:00`))

export function FilmList({ films, isLoading, onEdit, onDelete }: FilmListProps) {
  if (isLoading) {
    return <p className="empty-state">Loading your film log...</p>
  }

  if (films.length === 0) {
    return (
      <div className="placeholder-card">
        <strong>No films logged yet.</strong>
        <p className="empty-state">
          Your first entry will appear here, sorted by watch date.
        </p>
      </div>
    )
  }

  return (
    <div className="film-list">
      {films.map((film) => (
        <article className="film-card" key={film.id}>
          <header className="film-card__header">
            <div>
              <h3 className="film-card__title">{film.title}</h3>
              <p className="meta">
                {film.releaseYear ? `${film.releaseYear} • ` : ''}
                {formatDate(film.dateWatched)}
              </p>
            </div>
            <span className="film-card__rating">{film.rating === null ? 'Unrated' : `${film.rating.toFixed(1)} / 5`}</span>
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

          <div className="film-card__actions">
            <button className="button-secondary" type="button" onClick={() => onEdit(film)}>
              Edit
            </button>
            <button className="button-secondary button-secondary--danger" type="button" onClick={() => onDelete(film)}>
              Delete
            </button>
          </div>
        </article>
      ))}
    </div>
  )
}
