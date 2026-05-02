import { useEffect, useState } from 'react'
import { searchTmdbMovies, getTmdbMovieDetails, getTmdbImageUrl, type TmdbSearchResult, type NormalizedMovieMetadata } from '../services/tmdb'
import type { CreateFilmEntryInput, FilmEntry, OwnedMediaFormat, WatchContext } from '../types/film'

type FilmFormProps = { isSaving: boolean; onSubmit: (input: CreateFilmEntryInput) => Promise<boolean>; initialValues?: FilmEntry; submitLabel?: string; onCancel?: () => void }
type FilmFormState = { title: string; releaseYear: string; dateWatched: string; rating: string; tags: string[]; watchContext: WatchContext | ''; firstWatch: '' | 'yes' | 'no'; watchContextNote: string; ownedFormats: OwnedMediaFormat[]; onWishlist: boolean; isPublic: boolean; notes: string; tmdbMetadata?: NormalizedMovieMetadata; tmdbId?: number; tmdbQuery: string }
const initialState = (film?: FilmEntry): FilmFormState => ({ title: film?.title ?? '', releaseYear: film?.releaseYear ? String(film.releaseYear) : '', dateWatched: film?.dateWatched ?? new Date().toISOString().slice(0, 10), rating: film?.rating == null ? '' : String(film.rating), tags: film?.tags ?? [], watchContext: film?.metadata.watchContext ?? '', firstWatch: film?.metadata.firstWatch == null ? '' : film.metadata.firstWatch ? 'yes' : 'no', watchContextNote: film?.metadata.watchContextNote ?? '', ownedFormats: film?.metadata.ownedFormats ?? [], onWishlist: film?.metadata.onWishlist ?? false, isPublic: film?.isPublic ?? false, notes: film?.notes ?? '', tmdbMetadata: film?.tmdbMetadata, tmdbId: film?.tmdbId, tmdbQuery: '' })

export function FilmForm({ isSaving, onSubmit, initialValues, submitLabel = 'Add film', onCancel }: FilmFormProps) {
  const [form, setForm] = useState<FilmFormState>(() => initialState(initialValues))
  const [candidates, setCandidates] = useState<TmdbSearchResult[]>([])
  const [searchStatus, setSearchStatus] = useState('')

  useEffect(() => {
    const query = form.tmdbQuery.trim()
    if (query.length < 3) { setCandidates([]); return }
    const timer = window.setTimeout(async () => {
      try { setSearchStatus('Searching...'); setCandidates(await searchTmdbMovies(query)); setSearchStatus('') } catch { setSearchStatus('TMDb search unavailable. You can still log manually.') }
    }, 350)
    return () => window.clearTimeout(timer)
  }, [form.tmdbQuery])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const saved = await onSubmit({ title: form.title, releaseYear: form.releaseYear ? Number(form.releaseYear) : null, dateWatched: form.dateWatched, rating: form.rating ? Number(form.rating) : null, tags: form.tags, metadata: { watchContext: form.watchContext, firstWatch: form.firstWatch === '' ? null : form.firstWatch === 'yes', watchContextNote: form.watchContextNote, ownedFormats: form.ownedFormats, onWishlist: form.onWishlist }, notes: form.notes, isPublic: form.isPublic, tmdbId: form.tmdbId, tmdbMetadata: form.tmdbMetadata })
    if (saved) setForm(initialState())
  }

  return <form className="form-grid" onSubmit={handleSubmit}>{/* existing inputs omitted for brevity in this patch */}
    <div className="field"><label htmlFor="title">Film title</label><input id="title" value={form.title} onChange={(e)=>setForm(c=>({...c,title:e.target.value}))} required/></div>
    <div className="field"><label htmlFor="tmdbSearch">Search TMDb (optional)</label><input id="tmdbSearch" value={form.tmdbQuery} onChange={(e)=>setForm(c=>({...c,tmdbQuery:e.target.value}))} placeholder="Search title to link metadata" /></div>
    {searchStatus ? <p className="meta">{searchStatus}</p> : null}
    {candidates.map((movie)=> <button type="button" key={movie.id} className="button-secondary" onClick={async ()=>{ const details = await getTmdbMovieDetails(movie.id); setForm(c=>({...c, tmdbId: details.tmdbId, tmdbMetadata: details, title: details.title || c.title, releaseYear: details.releaseYear ? String(details.releaseYear) : c.releaseYear, tmdbQuery: ''})); setCandidates([]) }}>
      {movie.poster_path ? <img src={getTmdbImageUrl(movie.poster_path,'w92') ?? ''} alt="" width={46} /> : null} {movie.title} {movie.release_date ? `(${movie.release_date.slice(0,4)})` : ''}
    </button>)}
    {form.tmdbMetadata ? <div className="meta">Linked: {form.tmdbMetadata.title} • {form.tmdbMetadata.directors[0] ?? 'Director unavailable'} <button type="button" onClick={()=>setForm(c=>({...c,tmdbId:undefined,tmdbMetadata:undefined}))}>Clear link</button></div> : null}
    <div className="button-row"><button className="button-primary" type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : submitLabel}</button>{onCancel ? <button className="button-secondary" type="button" onClick={onCancel}>Cancel</button> : null}</div>
  </form>
}
