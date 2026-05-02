import type { FilmEntry } from '../types/film'
import { FilmCard } from './FilmCard'

type FilmListProps = {
  films: FilmEntry[]
  isLoading: boolean
  onEdit: (film: FilmEntry) => void
  onDelete: (film: FilmEntry) => void
}

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
        <FilmCard
          key={film.id}
          film={film}
          showLink
          showCollectionMeta
          showActions
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
