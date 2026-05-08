import { useState } from 'react'
import {
  ownedMediaOptions,
  watchContextOptions,
} from '../config/filmOptions'
import { RATING_OPTIONS, getRatingConfig } from '../config/filmTags'
import type { RatingValue } from '../config/filmTags'
import { TagInput } from './TagInput'
import { fetchTmdbMovieDetails, searchTmdbMovies, type TmdbSearchResult } from '../services/tmdbService'
import type {
  CreateFilmEntryInput,
  FilmEntry,
  FilmTmdbMetadata,
  OwnedMediaFormat,
  WatchContext,
} from '../types/film'

type FilmFormProps = {
  isSaving: boolean
  onSubmit: (input: CreateFilmEntryInput) => Promise<boolean>
  initialValues?: FilmEntry
  submitLabel?: string
  onCancel?: () => void
}

type FilmFormState = {
  title: string
  releaseYear: string
  dateWatched: string
  rating: string
  tags: string[]
  watchContext: WatchContext | ''
  firstWatch: '' | 'yes' | 'no'
  watchContextNote: string
  ownedFormats: OwnedMediaFormat[]
  onWishlist: boolean
  isPublic: boolean
  notes: string
  tmdb: FilmTmdbMetadata | null
}

const initialState = (film?: FilmEntry): FilmFormState => ({
  title: film?.title ?? '',
  releaseYear: film?.releaseYear ? String(film.releaseYear) : '',
  dateWatched: film?.dateWatched ?? new Date().toISOString().slice(0, 10),
  rating: film?.rating === null || film?.rating === undefined ? '' : String(film.rating),
  tags: film?.tags ?? [],
  watchContext: film?.metadata.watchContext ?? '',
  firstWatch:
    film?.metadata.firstWatch === null || film?.metadata.firstWatch === undefined
      ? ''
      : film.metadata.firstWatch
        ? 'yes'
        : 'no',
  watchContextNote: film?.metadata.watchContextNote ?? '',
  ownedFormats: film?.metadata.ownedFormats ?? [],
  onWishlist: film?.metadata.onWishlist ?? false,
  isPublic: film?.isPublic ?? false,
  notes: film?.notes ?? '',
  tmdb: film?.metadata.tmdb ?? null,
})

export function FilmForm({ isSaving, onSubmit, initialValues, submitLabel = 'Add film', onCancel }: FilmFormProps) {
  const [form, setForm] = useState<FilmFormState>(() => initialState(initialValues))
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<TmdbSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const handleChange =
    (field: keyof FilmFormState) =>
    (
      event: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) => {
      const { value } = event.target
      setForm((current) => ({ ...current, [field]: value }))
    }

  const handleSearch = async () => {
    if (!searchTerm.trim()) return
    setIsSearching(true)
    setSearchError(null)
    try {
      const results = await searchTmdbMovies(searchTerm)
      setSearchResults(results)
    } catch {
      setSearchError('Could not reach TMDb right now.')
    } finally {
      setIsSearching(false)
    }
  }

  const chooseMovie = async (result: TmdbSearchResult) => {
    try {
      const details = await fetchTmdbMovieDetails(Number(result.id))
      setForm((current) => ({
        ...current,
        title: details.title,
        releaseYear: details.releaseYear ? String(details.releaseYear) : current.releaseYear,
        tmdb: {
          id: details.id,
          posterPath: details.posterPath,
          posterUrl: details.posterUrl,
          director: details.director,
          runtime: details.runtime,
          popularity: details.popularity,
          genres: details.genres,
          cast: details.cast,
        },
      }))
      setSearchResults([])
    } catch {
      setSearchError('Could not load full details for that title.')
    }
  }

  const toggleOwnedFormat = (format: OwnedMediaFormat) => {
    setForm((current) => ({
      ...current,
      ownedFormats: current.ownedFormats.includes(format)
        ? current.ownedFormats.filter((value) => value !== format)
        : [...current.ownedFormats, format],
    }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const saved = await onSubmit({
      title: form.title,
      releaseYear: form.releaseYear ? Number(form.releaseYear) : null,
      dateWatched: form.dateWatched,
      rating: form.rating ? Number(form.rating) : null,
      tags: form.tags,
      metadata: {
        watchContext: form.watchContext,
        firstWatch:
          form.firstWatch === '' ? null : form.firstWatch === 'yes',
        watchContextNote: form.watchContextNote,
        ownedFormats: form.ownedFormats,
        onWishlist: form.onWishlist,
        tmdb: form.tmdb,
      },
      notes: form.notes,
      isPublic: form.isPublic,
    })

    if (saved) {
      setForm(initialState())
    }
  }

  const ratingDescription =
    form.rating !== ''
      ? getRatingConfig(Number(form.rating) as RatingValue)?.description
      : null

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="tmdbSearch">Find on TMDb</label>
        <div className="button-row">
          <input
            id="tmdbSearch"
            className="tmdb-search-input"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search movie title"
          />
          <button className="button-secondary" type="button" onClick={() => void handleSearch()} disabled={isSearching}>
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>
        {searchError ? <p className="alert alert--error" role="alert">{searchError}</p> : null}
        {searchResults.length > 0 ? (
          <div className="tmdb-results">
            {searchResults.map((result) => (
              <button
                key={result.id}
                type="button"
                className="tmdb-result"
                onClick={() => void chooseMovie(result)}
              >
                {result.poster_path ? (
                  <img
                    className="tmdb-result__poster"
                    src={`https://image.tmdb.org/t/p/w92${result.poster_path}`}
                    alt=""
                    loading="lazy"
                  />
                ) : (
                  <div className="tmdb-result__poster tmdb-result__poster--placeholder">
                    No poster
                  </div>
                )}
                <div className="tmdb-result__main">
                  <p className="tmdb-result__title">
                    {result.title}
                    {result.release_date ? ` (${result.release_date.slice(0, 4)})` : ''}
                  </p>
                  {result.overview?.trim() ? (
                    <p className="tmdb-result__meta">{result.overview}</p>
                  ) : null}
                </div>
                <span className="tmdb-result__cta">Use</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="field">
        <label htmlFor="title">
          Film title<span className="field__required" aria-label="required">*</span>
        </label>
        <input id="title" name="title" value={form.title} onChange={handleChange('title')} placeholder="In the Mood for Love" autoComplete="off" required autoFocus />
      </div>

      <div className="form-grid__row">
        <div className="field">
          <label htmlFor="releaseYear">Release year</label>
          <input id="releaseYear" name="releaseYear" type="number" min="1888" max="2100" step="1" inputMode="numeric" value={form.releaseYear} onChange={handleChange('releaseYear')} placeholder="2000" />
        </div>
        <div className="field">
          <label htmlFor="dateWatched">
            Date watched<span className="field__required" aria-label="required">*</span>
          </label>
          <input id="dateWatched" name="dateWatched" type="date" value={form.dateWatched} onChange={handleChange('dateWatched')} required />
        </div>
        <div className="field">
          <label htmlFor="rating">Rating</label>
          <select id="rating" name="rating" value={form.rating} onChange={handleChange('rating')}>
            <option value="">Unrated</option>
            {RATING_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          {ratingDescription ? (
            <p className="field__hint">{ratingDescription}</p>
          ) : null}
        </div>
      </div>
      <TagInput selectedTags={form.tags} onChange={(tags) => setForm((current) => ({ ...current, tags }))} />
      <div className="field">
        <label htmlFor="watchContext">Watch context</label>
        <select id="watchContext" name="watchContext" value={form.watchContext} onChange={handleChange('watchContext')}>
          <option value="">Choose a context</option>
          {watchContextOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="firstWatch">First watch?</label>
        <select id="firstWatch" name="firstWatch" value={form.firstWatch} onChange={handleChange('firstWatch')}>
          <option value="">Not set</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="watchContextNote">Context note</label>
        <input id="watchContextNote" name="watchContextNote" value={form.watchContextNote} onChange={handleChange('watchContextNote')} placeholder="Optional note about the setup or screening" />
      </div>
      <div className="field">
        <label>Collection details</label>
        <div className="check-grid">
          {ownedMediaOptions.map((option) => (
            <label key={option.value} className="check-pill">
              <input type="checkbox" checked={form.ownedFormats.includes(option.value)} onChange={() => toggleOwnedFormat(option.value)} />
              <span>{option.label}</span>
            </label>
          ))}
          <label className="check-pill check-pill--accent">
            <input type="checkbox" checked={form.onWishlist} onChange={(event) => setForm((current) => ({ ...current, onWishlist: event.target.checked }))} />
            <span>Keep on wishlist</span>
          </label>
        </div>
      </div>
      <div className="field">
        <label className="check-pill check-pill--accent">
          <input type="checkbox" checked={form.isPublic} onChange={(event) => setForm((current) => ({ ...current, isPublic: event.target.checked }))} />
          <span>Show in public preview</span>
        </label>
      </div>
      <div className="field">
        <label htmlFor="notes">Notes</label>
        <textarea id="notes" name="notes" value={form.notes} onChange={handleChange('notes')} placeholder="A few lines about what landed, what dragged, or what you want to remember." />
      </div>
      <div className="button-row">
        <button className="button-primary" type="submit" disabled={isSaving}>
          {isSaving ? 'Saving...' : submitLabel}
        </button>
        {onCancel ? (
          <button className="button-secondary" type="button" onClick={onCancel}>
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  )
}
