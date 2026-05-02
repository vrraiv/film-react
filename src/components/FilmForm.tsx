import { useEffect, useState } from 'react'
import { ownedMediaOptions, watchContextOptions } from '../config/filmOptions'
import { RATING_OPTIONS } from '../config/filmTags'
import {
  getTmdbImageUrl,
  getTmdbMovieDetails,
  searchTmdbMovies,
  type NormalizedMovieMetadata,
  type TmdbSearchResult,
} from '../services/tmdb'
import { TagInput } from './TagInput'
import type {
  CreateFilmEntryInput,
  FilmEntry,
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
  tmdbQuery: string
  tmdbId?: number
  tmdbMetadata?: NormalizedMovieMetadata
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
  tmdbQuery: '',
  tmdbId: film?.tmdbId,
  tmdbMetadata: film?.tmdbMetadata,
})

export function FilmForm({ isSaving, onSubmit, initialValues, submitLabel = 'Add film', onCancel }: FilmFormProps) {
  const [form, setForm] = useState<FilmFormState>(() => initialState(initialValues))
  const [candidates, setCandidates] = useState<TmdbSearchResult[]>([])
  const [searchStatus, setSearchStatus] = useState<string | null>(null)

  useEffect(() => {
    const query = form.tmdbQuery.trim()
    if (query.length < 3) {
      setCandidates([])
      setSearchStatus(null)
      return
    }

    const timer = window.setTimeout(async () => {
      try {
        setSearchStatus('Searching TMDb...')
        const results = await searchTmdbMovies(query)
        setCandidates(results)
        setSearchStatus(results.length === 0 ? 'No TMDb matches found. You can still log manually.' : null)
      } catch {
        setSearchStatus('TMDb search is unavailable right now. You can still log manually.')
      }
    }, 350)

    return () => window.clearTimeout(timer)
  }, [form.tmdbQuery])

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
        firstWatch: form.firstWatch === '' ? null : form.firstWatch === 'yes',
        watchContextNote: form.watchContextNote,
        ownedFormats: form.ownedFormats,
        onWishlist: form.onWishlist,
      },
      notes: form.notes,
      isPublic: form.isPublic,
      tmdbId: form.tmdbId,
      tmdbMetadata: form.tmdbMetadata,
    })

    if (saved) {
      setForm(initialState())
      setCandidates([])
      setSearchStatus(null)
    }
  }

  const selectMovie = async (movie: TmdbSearchResult) => {
    const details = await getTmdbMovieDetails(movie.id)
    setForm((current) => ({
      ...current,
      tmdbId: details.tmdbId,
      tmdbMetadata: details,
      title: details.title || current.title,
      releaseYear: details.releaseYear ? String(details.releaseYear) : current.releaseYear,
      tmdbQuery: '',
    }))
    setCandidates([])
    setSearchStatus(null)
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="title">Film title</label>
        <input id="title" value={form.title} onChange={(event) => setForm((c) => ({ ...c, title: event.target.value }))} required />
      </div>

      <div className="field">
        <label htmlFor="tmdbSearch">Search TMDb (optional)</label>
        <input id="tmdbSearch" value={form.tmdbQuery} onChange={(event) => setForm((c) => ({ ...c, tmdbQuery: event.target.value }))} placeholder="Search a film title" />
      </div>

      {searchStatus ? <p className="meta">{searchStatus}</p> : null}
      {candidates.map((movie) => (
        <button key={movie.id} type="button" className="button-secondary" onClick={() => void selectMovie(movie)}>
          {movie.poster_path ? <img src={getTmdbImageUrl(movie.poster_path, 'w92') ?? ''} alt="" width={40} /> : null}
          {' '}{movie.title} {movie.release_date ? `(${movie.release_date.slice(0, 4)})` : ''}
        </button>
      ))}

      {form.tmdbMetadata ? (
        <p className="meta">
          Linked: {form.tmdbMetadata.title} ({form.tmdbMetadata.releaseYear ?? 'n/a'}) • {form.tmdbMetadata.directors.join(', ') || 'Director unavailable'}
          <button type="button" className="button-secondary" onClick={() => setForm((c) => ({ ...c, tmdbId: undefined, tmdbMetadata: undefined }))}>Clear link</button>
        </p>
      ) : null}

      <div className="form-grid__row"><div className="field"><label htmlFor="releaseYear">Release year</label><input id="releaseYear" type="number" min="1888" max="2100" value={form.releaseYear} onChange={(event) => setForm((c) => ({ ...c, releaseYear: event.target.value }))} /></div><div className="field"><label htmlFor="dateWatched">Date watched</label><input id="dateWatched" type="date" value={form.dateWatched} onChange={(event) => setForm((c) => ({ ...c, dateWatched: event.target.value }))} required /></div><div className="field"><label htmlFor="rating">Rating</label><select id="rating" value={form.rating} onChange={(event) => setForm((c) => ({ ...c, rating: event.target.value }))}><option value="">Unrated</option>{RATING_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label} - {option.description}</option>)}</select></div></div>
      <TagInput selectedTags={form.tags} onChange={(tags) => setForm((current) => ({ ...current, tags }))} />
      <div className="field"><label htmlFor="watchContext">Watch context</label><select id="watchContext" value={form.watchContext} onChange={(event) => setForm((c) => ({ ...c, watchContext: event.target.value as WatchContext | '' }))}><option value="">Choose a context</option>{watchContextOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
      <div className="field"><label htmlFor="firstWatch">First watch?</label><select id="firstWatch" value={form.firstWatch} onChange={(event) => setForm((c) => ({ ...c, firstWatch: event.target.value as '' | 'yes' | 'no' }))}><option value="">Not set</option><option value="yes">Yes</option><option value="no">No</option></select></div>
      <div className="field"><label htmlFor="watchContextNote">Context note</label><input id="watchContextNote" value={form.watchContextNote} onChange={(event) => setForm((c) => ({ ...c, watchContextNote: event.target.value }))} /></div>
      <div className="field"><label>Collection details</label><div className="check-grid">{ownedMediaOptions.map((option) => <label key={option.value} className="check-pill"><input type="checkbox" checked={form.ownedFormats.includes(option.value)} onChange={() => setForm((c) => ({ ...c, ownedFormats: c.ownedFormats.includes(option.value) ? c.ownedFormats.filter((v) => v !== option.value) : [...c.ownedFormats, option.value] }))} /><span>{option.label}</span></label>)}<label className="check-pill check-pill--accent"><input type="checkbox" checked={form.onWishlist} onChange={(event) => setForm((c) => ({ ...c, onWishlist: event.target.checked }))} /><span>Keep on wishlist</span></label></div></div>
      <div className="field"><label className="check-pill check-pill--accent"><input type="checkbox" checked={form.isPublic} onChange={(event) => setForm((current) => ({ ...current, isPublic: event.target.checked }))} /><span>Show in public preview</span></label></div>
      <div className="field"><label htmlFor="notes">Notes</label><textarea id="notes" value={form.notes} onChange={(event) => setForm((c) => ({ ...c, notes: event.target.value }))} /></div>
      <div className="button-row"><button className="button-primary" type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : submitLabel}</button>{onCancel ? <button className="button-secondary" type="button" onClick={onCancel}>Cancel</button> : null}</div>
    </form>
  )
}
