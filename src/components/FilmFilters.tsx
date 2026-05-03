import { watchContextOptions } from '../config/filmOptions'
import type { WatchContext } from '../types/film'

export type FilmFiltersState = {
  titleQuery: string
  releaseYearQuery: string
  directorQuery: string
  tagQuery: string
  minimumRating: string
  watchContext: WatchContext | ''
}

type FilmFiltersProps = {
  filters: FilmFiltersState
  onChange: (filters: FilmFiltersState) => void
  compact?: boolean
}

export function FilmFilters({ filters, onChange, compact = false }: FilmFiltersProps) {
  return (
    <div className={['filter-grid', compact ? 'filter-grid--compact' : ''].filter(Boolean).join(' ')}>
      <div className="field">
        <label htmlFor="filterTitle">Title keyword</label>
        <input
          id="filterTitle"
          type="text"
          value={filters.titleQuery}
          placeholder="e.g. alien"
          onChange={(event) =>
            onChange({ ...filters, titleQuery: event.target.value })
          }
        />
      </div>

      <div className="field">
        <label htmlFor="filterYear">Year</label>
        <input
          id="filterYear"
          type="text"
          value={filters.releaseYearQuery}
          placeholder="e.g. 1979"
          onChange={(event) =>
            onChange({ ...filters, releaseYearQuery: event.target.value })
          }
        />
      </div>

      {!compact ? (
        <div className="field">
        <label htmlFor="filterDirector">Director</label>
        <input
          id="filterDirector"
          type="text"
          value={filters.directorQuery}
          placeholder="e.g. ridley scott"
          onChange={(event) =>
            onChange({ ...filters, directorQuery: event.target.value })
          }
        />
        </div>
      ) : null}

      <div className="field">
        <label htmlFor="filterTag">Tag</label>
        <input
          id="filterTag"
          type="text"
          value={filters.tagQuery}
          placeholder="manual tag search"
          onChange={(event) =>
            onChange({ ...filters, tagQuery: event.target.value })
          }
        />
      </div>

      <div className="field">
        <label htmlFor="minimumRating">Minimum rating</label>
        <select
          id="minimumRating"
          value={filters.minimumRating}
          onChange={(event) =>
            onChange({ ...filters, minimumRating: event.target.value })
          }
        >
          <option value="">Any rating</option>
          <option value="5">5.0</option>
          <option value="4.5">4.5</option>
          <option value="4">4.0</option>
          <option value="3.5">3.5</option>
          <option value="3">3.0</option>
          <option value="2.5">2.5</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="watchContextFilter">Watch context</label>
        <select
          id="watchContextFilter"
          value={filters.watchContext}
          onChange={(event) =>
            onChange({
              ...filters,
              watchContext: event.target.value as WatchContext | '',
            })
          }
        >
          <option value="">All contexts</option>
          {watchContextOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
