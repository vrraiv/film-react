import {
  filmTagOptions,
  watchContextOptions,
} from '../config/filmOptions'
import type { WatchContext } from '../types/film'

export type FilmFiltersState = {
  selectedTag: string
  minimumRating: string
  watchContext: WatchContext | ''
}

type FilmFiltersProps = {
  filters: FilmFiltersState
  onChange: (filters: FilmFiltersState) => void
}

export function FilmFilters({ filters, onChange }: FilmFiltersProps) {
  return (
    <div className="filter-grid">
      <div className="field">
        <label htmlFor="filterTag">Film tag</label>
        <select
          id="filterTag"
          value={filters.selectedTag}
          onChange={(event) =>
            onChange({ ...filters, selectedTag: event.target.value })
          }
        >
          <option value="">All tags</option>
          {filmTagOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.categoryLabel}: {option.label}
            </option>
          ))}
        </select>
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
