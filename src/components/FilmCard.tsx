import { Link } from 'react-router-dom'
import { useState } from 'react'
import {
  formatOwnedMedia,
  formatWatchContext,
  formatFilmTag,
} from '../config/filmOptions'
import type { FilmEntry } from '../types/film'

type FilmCardProps = {
  film: FilmEntry
  showLink?: boolean
  showCollectionMeta?: boolean
  showActions?: boolean
  onEdit?: (film: FilmEntry) => void
  onDelete?: (film: FilmEntry) => void
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
  }).format(new Date(`${value}T00:00:00`))

const getTmdbMetadata = (film: FilmEntry) => film.tmdbMetadata ?? film.metadata.tmdb
const readonlyTagLimit = 5

export function FilmCard({
  film,
  showLink = false,
  showCollectionMeta = false,
  showActions = false,
  onEdit,
  onDelete,
}: FilmCardProps) {
  const tmdb = getTmdbMetadata(film)
  const displayTitle = film.title
  const director = tmdb?.director?.trim() || null
  const [isTagListExpanded, setIsTagListExpanded] = useState(false)
  const formattedTags = film.tags.map((tag) => ({ id: tag, label: formatFilmTag(tag) }))
  const visibleTags = isTagListExpanded ? formattedTags : formattedTags.slice(0, readonlyTagLimit)
  const hiddenTagCount = Math.max(0, formattedTags.length - readonlyTagLimit)
  const tagListLabel = formattedTags.map((tag) => tag.label).join(', ')

  return (
    <article className="film-card" key={film.id}>
      <div className="film-card__content">
        <div className="film-card__poster-wrap">
          {tmdb?.posterUrl ? (
            <img
              className="film-card__poster"
              src={tmdb.posterUrl}
              alt={`Poster for ${displayTitle}`}
              loading="lazy"
            />
          ) : (
            <div className="film-card__poster film-card__poster--placeholder" aria-hidden="true">
              No poster
            </div>
          )}
        </div>

        <div className="film-card__details">
          <header className="film-card__header">
            <div>
              <h3 className="film-card__title">
                {showLink ? <Link to={`/film/${film.id}`}>{displayTitle}</Link> : displayTitle}
              </h3>
              <p className="meta">{film.releaseYear ? `${film.releaseYear} • ` : ''}Watched {formatDate(film.dateWatched)}</p>
              {director ? <p className="meta">Director: {director}</p> : null}
            </div>
            <span className="film-card__rating">{film.rating === null ? 'Unrated' : `${film.rating.toFixed(1)} / 5`}</span>
          </header>

          {film.tags.length > 0 ? (
            <div
              className={`tag-row tag-row--readonly${isTagListExpanded ? ' tag-row--readonly-expanded' : ''}`}
              aria-label={`Tags: ${tagListLabel}`}
              title={tagListLabel}
            >
              {visibleTags.map((tag) => (
                <span className="tag-chip tag-chip--static" key={tag.id}>
                  {tag.label}
                </span>
              ))}
              {hiddenTagCount > 0 ? (
                <button
                  className="tag-chip tag-chip--static tag-chip--overflow tag-chip--toggle"
                  type="button"
                  aria-expanded={isTagListExpanded}
                  aria-label={isTagListExpanded ? 'Collapse tags' : `Show ${hiddenTagCount} more tags`}
                  onClick={() => setIsTagListExpanded((current) => !current)}
                >
                  {isTagListExpanded ? 'Less' : `+${hiddenTagCount}`}
                </button>
              ) : null}
            </div>
          ) : null}

          {showCollectionMeta ? (
            <>
              <div className="meta-row">
                {film.metadata.watchContext ? (
                  <span className="meta-pill">{formatWatchContext(film.metadata.watchContext)}</span>
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

              {film.metadata.watchContextNote ? <p className="meta">{film.metadata.watchContextNote}</p> : null}
            </>
          ) : null}

          {film.notes ? <p className="film-card__notes">{film.notes}</p> : null}

          {showActions && onEdit && onDelete ? (
            <div className="film-card__actions">
              <button className="button-secondary" type="button" onClick={() => onEdit(film)}>
                Edit
              </button>
              <button className="button-secondary button-secondary--danger" type="button" onClick={() => onDelete(film)}>
                Delete
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  )
}
