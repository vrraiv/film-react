import type { FilmEntry } from '../types/film'
import { FilmCard } from './FilmCard'

type FilmListProps = {
  films: FilmEntry[]
  isLoading: boolean
  confirmingDeleteId?: string | null
  highlightedFilmId?: string | null
  onEdit: (film: FilmEntry) => void
  onRequestDelete: (film: FilmEntry) => void
  onConfirmDelete: (film: FilmEntry) => void
  onCancelDelete: () => void
  isFiltered?: boolean
  totalCount?: number
}

export function FilmList({
  films,
  isLoading,
  confirmingDeleteId = null,
  highlightedFilmId = null,
  onEdit,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
  isFiltered = false,
  totalCount,
}: FilmListProps) {
  if (isLoading) {
    return (
      <div className="skeleton-list" aria-busy="true" aria-label="Loading your film log">
        <div className="skeleton-card skeleton-card--card" />
        <div className="skeleton-card skeleton-card--card" />
        <div className="skeleton-card skeleton-card--card" />
      </div>
    )
  }

  if (films.length === 0) {
    if (isFiltered && (totalCount ?? 0) > 0) {
      return (
        <div className="placeholder-card placeholder-card--warning" role="status">
          <strong>No matches.</strong>
          <p className="empty-state">No logged films match these filters.</p>
        </div>
      )
    }

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
        <div
          key={film.id}
          id={`film-entry-${film.id}`}
          className={`film-list__entry${highlightedFilmId === film.id ? ' film-list__entry--highlight' : ''}`}
        >
          <FilmCard
            film={film}
            showLink
            showCollectionMeta
            showActions
            onEdit={onEdit}
            onDelete={onRequestDelete}
          />
          {confirmingDeleteId === film.id ? (
            <div className="film-list__confirm" role="alertdialog" aria-label={`Confirm deletion of ${film.title}`}>
              <p>
                Delete &ldquo;<strong>{film.title}</strong>&rdquo; from your log?
              </p>
              <div className="button-row">
                <button
                  className="button-secondary"
                  type="button"
                  onClick={onCancelDelete}
                  autoFocus
                >
                  Cancel
                </button>
                <button
                  className="button-secondary button-secondary--danger"
                  type="button"
                  onClick={() => onConfirmDelete(film)}
                >
                  Confirm delete
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}
