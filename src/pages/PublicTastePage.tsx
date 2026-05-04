import { useEffect, useMemo, useState } from 'react'
import { FilmCard } from '../components/FilmCard'
import { formatFilmTag } from '../config/filmOptions'
import { buildPublicTasteBrowser, type PublicTasteFilters } from '../features/tasteProfile/publicTasteBrowser'
import { fetchPublicFilmEntries } from '../services/publicFilmProfileService'
import type { FilmEntry } from '../types/film'

const defaultFilters: PublicTasteFilters = {
  tagOrMood: '',
  runtimeBucket: 'all',
}

export function PublicTastePage() {
  const [films, setFilms] = useState<FilmEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<PublicTasteFilters>(defaultFilters)
  const [selectedFilmId, setSelectedFilmId] = useState('')

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const nextFilms = await fetchPublicFilmEntries()
        if (isMounted) setFilms(nextFilms)
      } catch (loadError) {
        console.error(loadError)
        if (isMounted) setError('We could not load public taste modules right now.')
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    void load()
    return () => {
      isMounted = false
    }
  }, [])

  const browser = useMemo(() => buildPublicTasteBrowser(films, filters), [films, filters])
  const related = useMemo(() => browser.relatedByFilm(selectedFilmId), [browser, selectedFilmId])

  return (
    <section className="page">
      <header className="page__hero">
        <span className="eyebrow">Public taste browser</span>
        <h2 className="page__title">Taste profile from watched and rated films only.</h2>
        <p className="page__copy">Deterministic modules for friends and visitors. No unseen-movie recommendations.</p>
        <div className="filter-grid filter-grid--compact">
          <div className="field">
            <label htmlFor="tasteTag">Mood / tag</label>
            <select id="tasteTag" value={filters.tagOrMood} onChange={(event) => setFilters((current) => ({ ...current, tagOrMood: event.target.value }))}>
              <option value="">All tags</option>
              {browser.availableTags.map((tagId) => (
                <option key={tagId} value={tagId}>{formatFilmTag(tagId)}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="runtimeBucket">Runtime</label>
            <select id="runtimeBucket" value={filters.runtimeBucket} onChange={(event) => setFilters((current) => ({ ...current, runtimeBucket: event.target.value as PublicTasteFilters['runtimeBucket'] }))}>
              <option value="all">All runtimes</option>
              <option value="short">Short (&lt;90m)</option>
              <option value="feature">Feature (90-120m)</option>
              <option value="long">Long (121-150m)</option>
              <option value="epic">Epic (151m+)</option>
              <option value="unknown">Unknown runtime</option>
            </select>
          </div>
        </div>
      </header>
      {isLoading ? <p className="empty-state">Loading taste browser...</p> : null}
      {error ? <p className="empty-state">{error}</p> : null}

      {!isLoading && !error ? (
        <>
          <TasteSection title="Starter Pack" items={browser.starterPack} />
          <TasteSection title="Personal Canon" items={browser.personalCanon} />
          <TasteSection title="Best by Mood / Tag" items={browser.bestByMoodOrTag} />
          {browser.deepCutsDataAvailable ? (
            <TasteSection title="Deep Cuts I Liked" items={browser.deepCuts} />
          ) : (
            <section className="panel">
              <h3>Deep Cuts I Liked</h3>
              <p className="meta">No TMDB popularity values are available yet for the current filter set.</p>
            </section>
          )}
          <TasteSection title="Not For Everyone" items={browser.notForEveryone} />
          <section className="panel">
            <h3>If You Like This, Try This From My Diary</h3>
            <div className="field">
              <label htmlFor="seedFilm">Pick a logged film</label>
              <select id="seedFilm" value={selectedFilmId} onChange={(event) => setSelectedFilmId(event.target.value)}>
                <option value="">Choose a film</option>
                {browser.filtered.map((film) => <option key={film.id} value={film.id}>{film.title}</option>)}
              </select>
            </div>
            {selectedFilmId ? <TasteSection title="Related logged films" items={related} /> : null}
          </section>
        </>
      ) : null}
    </section>
  )
}

function TasteSection({ title, items }: { title: string; items: Array<{ film: FilmEntry; explanation: string }> }) {
  return (
    <section className="panel">
      <h3>{title}</h3>
      {items.length === 0 ? <p className="empty-state">No matching logged films for current filters.</p> : null}
      <div className="film-list">
        {items.map((item) => (
          <div key={item.film.id}>
            <FilmCard film={item.film} />
            <p className="meta">{item.explanation}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
