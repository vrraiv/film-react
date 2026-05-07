import { formatFilmTag, watchContextOptions } from '../config/filmOptions'
import { RATING_OPTIONS } from '../config/filmTags'
import type { WatchContext } from '../types/film'

export type FilmSort = 'recent' | 'rating-high' | 'oldest'

export type FilmFiltersState = {
  titleQuery: string
  releaseYearQuery: string
  directorQuery: string
  tagQuery: string
  minimumRating: string
  watchContext: WatchContext | ''
  sort: FilmSort
}

type FilmFiltersProps = {
  filters: FilmFiltersState
  onChange: (filters: FilmFiltersState) => void
  compact?: boolean
  className?: string
  availableTags?: string[]
  availableWatchContexts?: WatchContext[]
}

export function FilmFilters({
  filters,
  onChange,
  compact = false,
  className,
  availableTags,
  availableWatchContexts,
}: FilmFiltersProps) {
  const classes = ['filter-grid', compact ? 'filter-grid--compact' : '', className ?? '']
    .filter(Boolean)
    .join(' ')

  const visibleWatchContexts = availableWatchContexts
    ? watchContextOptions.filter((option) => availableWatchContexts.includes(option.value))
    : watchContextOptions

  return (
    <div className={classes}>
      <div className="field">
        <label htmlFor="filterTitle">Title keyword</label>
        <input
          id="filterTitle"
          type="text"
          value={filters.titleQuery}
          placeholder="e.g. Alien"
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

      <div className="field">
        <label htmlFor="filterDirector">Director</label>
        <input
          id="filterDirector"
          type="text"
          value={filters.directorQuery}
          placeholder="e.g. Ridley Scott"
          onChange={(event) =>
            onChange({ ...filters, directorQuery: event.target.value })
          }
        />
      </div>

      <div className="field">
        <label htmlFor="filterTag">Tag</label>
        <select
          id="filterTag"
          value={filters.tagQuery}
          onChange={(event) =>
            onChange({ ...filters, tagQuery: event.target.value })
          }
        >
          <option value="">All tags</option>
          {(availableTags ?? []).map((tagId) => (
            <option key={tagId} value={tagId}>
              {formatFilmTag(tagId)}
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
          {RATING_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
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
          {visibleWatchContexts.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="filterSort">Sort</label>
        <select
          id="filterSort"
          value={filters.sort}
          onChange={(event) =>
            onChange({ ...filters, sort: event.target.value as FilmSort })
          }
        >
          <option value="recent">Recently watched</option>
          <option value="rating-high">Highest rated</option>
          <option value="oldest">Oldest watched</option>
        </select>
      </div>
    </div>
  )
}
