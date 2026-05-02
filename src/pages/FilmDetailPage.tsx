import { Link, Navigate, useParams } from 'react-router-dom'
import { formatFilmTag, formatOwnedMedia, formatWatchContext } from '../config/filmOptions'
import { useFilms } from '../hooks/useFilms'

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'full',
  }).format(new Date(`${value}T00:00:00`))

export function FilmDetailPage() {
  const { filmId } = useParams<{ filmId: string }>()
  const { films, isLoading } = useFilms()

  if (!filmId) {
    return <Navigate to="/log" replace />
  }

  if (isLoading) {
    return <p className="empty-state">Loading film details...</p>
  }

  const film = films.find((entry) => entry.id === filmId)

  if (!film) {
    return (
      <section className="page">
        <header className="page__hero">
          <span className="eyebrow">Film detail</span>
          <h2 className="page__title">Film not found</h2>
          <p className="page__copy">That entry may have been removed from your local log.</p>
          <p>
            <Link className="button-secondary" to="/log">Back to log</Link>
          </p>
        </header>
      </section>
    )
  }

  return (
    <section className="page">
      <header className="page__hero">
        <span className="eyebrow">Film detail</span>
        <h2 className="page__title">{film.title}</h2>
        <p className="page__copy">All stored fields for this entry are shown below.</p>
      </header>

      <section className="panel film-detail">
        <dl className="detail-grid">
          <div>
            <dt>Title</dt>
            <dd>{film.title}</dd>
          </div>
          <div>
            <dt>Release year</dt>
            <dd>{film.releaseYear ?? 'Not set'}</dd>
          </div>
          <div>
            <dt>Date watched</dt>
            <dd>{formatDate(film.dateWatched)}</dd>
          </div>
          <div>
            <dt>Date logged</dt>
            <dd>{film.metadata.dateLogged ? formatDate(film.metadata.dateLogged.slice(0, 10)) : 'Not set'}</dd>
          </div>
          <div>
            <dt>Rating</dt>
            <dd>{film.rating === null ? 'Unrated' : `${film.rating.toFixed(1)} / 5`}</dd>
          </div>
          <div>
            <dt>Public entry</dt>
            <dd>{film.isPublic ? 'Yes' : 'No'}</dd>
          </div>
          <div>
            <dt>Watch context</dt>
            <dd>{formatWatchContext(film.metadata.watchContext)}</dd>
          </div>
          <div>
            <dt>First watch</dt>
            <dd>
              {film.metadata.firstWatch === null ? 'Not set' : film.metadata.firstWatch ? 'Yes' : 'No'}
            </dd>
          </div>
          <div>
            <dt>Watch context note</dt>
            <dd>{film.metadata.watchContextNote || 'None'}</dd>
          </div>
          <div>
            <dt>On wishlist</dt>
            <dd>{film.metadata.onWishlist ? 'Yes' : 'No'}</dd>
          </div>
          <div>
            <dt>Owned formats</dt>
            <dd>
              {film.metadata.ownedFormats.length
                ? film.metadata.ownedFormats.map((format) => formatOwnedMedia(format)).join(', ')
                : 'None'}
            </dd>
          </div>
          <div>
            <dt>Taste tags</dt>
            <dd>
              {film.tags.length
                ? film.tags.map((tag) => formatFilmTag(tag)).join(', ')
                : 'None'}
            </dd>
          </div>
          <div>
            <dt>Notes</dt>
            <dd>{film.notes || 'None'}</dd>
          </div>

          {film.metadata.tmdb ? (
            <>
              <div><dt>TMDb ID</dt><dd>{film.metadata.tmdb.id}</dd></div>
              <div><dt>Director</dt><dd>{film.metadata.tmdb.director ?? 'Unknown'}</dd></div>
              <div><dt>Runtime</dt><dd>{film.metadata.tmdb.runtime ? `${film.metadata.tmdb.runtime} min` : 'Unknown'}</dd></div>
              <div><dt>Genres</dt><dd>{film.metadata.tmdb.genres.length ? film.metadata.tmdb.genres.join(', ') : 'None'}</dd></div>
              <div><dt>Cast</dt><dd>{film.metadata.tmdb.cast.length ? film.metadata.tmdb.cast.join(', ') : 'None'}</dd></div>
              <div><dt>Poster</dt><dd>{film.metadata.tmdb.posterUrl ? <a href={film.metadata.tmdb.posterUrl} target="_blank" rel="noreferrer">Open poster</a> : 'None'}</dd></div>
            </>
          ) : null}

          <div>
            <dt>Film ID</dt>
            <dd><code>{film.id}</code></dd>
          </div>
        </dl>

        <div>
          <Link className="button-secondary" to="/log">Back to log</Link>
        </div>
      </section>
    </section>
  )
}
