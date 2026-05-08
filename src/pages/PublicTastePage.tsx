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
      } catch {
        if (isMounted) setError('We could not load this shared watch guide right now.')
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
      <header className="page__hero page__hero--sticky">
        <span className="eyebrow">Shared picks</span>
        <h2 className="page__title">Shared picks.</h2>
        <p className="page__copy">Curated cross-sections of the diary &mdash; by mood, runtime, and shape.</p>
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
      {isLoading ? (
        <div className="skeleton-list" aria-busy="true" aria-label="Loading shared picks">
          <div className="skeleton-card skeleton-card--card" />
          <div className="skeleton-card skeleton-card--card" />
          <div className="skeleton-card skeleton-card--card" />
        </div>
      ) : null}
      {error ? <p className="alert alert--error" role="alert">{error}</p> : null}

      {!isLoading && !error ? (
        <>
          <TasteSection
            title="Starter Pack"
            subtitle="A representative cross-section if you're just dropping in."
            items={browser.starterPack}
            emptyCopy="No starter picks for this filter yet."
          />
          <TasteSection
            title="Personal Canon"
            subtitle="The films I'd defend on a desert island."
            items={browser.personalCanon}
            emptyCopy="No canon picks match these filters."
          />
          <TasteSection
            title="Best by Mood"
            subtitle="Strongest pick for whatever mood you filtered by."
            items={browser.bestByMoodOrTag}
            emptyCopy="Try a different mood — nothing rises to the top here yet."
          />
          {browser.deepCutsDataAvailable ? (
            <TasteSection
              title="Deep Cuts I Liked"
              subtitle="Lower-popularity finds that landed for me."
              items={browser.deepCuts}
              emptyCopy="No popularity data for this slice — try a broader runtime."
            />
          ) : (
            <section className="panel">
              <header className="panel__header">
                <h3 className="panel__title">Deep Cuts I Liked</h3>
                <p className="panel__subtitle">Lower-popularity finds that landed for me.</p>
              </header>
              <p className="meta">There is not enough popularity information for this filter yet.</p>
            </section>
          )}
          <TasteSection
            title="Not For Everyone"
            subtitle="High-rated picks I'd hesitate to hand to a stranger."
            items={browser.notForEveryone}
            emptyCopy="Nothing flagged as polarising in this slice."
          />
          <section className="panel">
            <header className="panel__header">
              <h3 className="panel__title">If You Like This, Try This From My Diary</h3>
              <p className="panel__subtitle">Pick a film and I'll surface adjacent watches from the log.</p>
            </header>
            <div className="field">
              <label htmlFor="seedFilm">Pick a film from the diary</label>
              <select id="seedFilm" value={selectedFilmId} onChange={(event) => setSelectedFilmId(event.target.value)}>
                <option value="">Choose a film</option>
                {browser.filtered.map((film) => <option key={film.id} value={film.id}>{film.title}</option>)}
              </select>
            </div>
            {selectedFilmId ? (
              <TasteSection
                title="You might also like from this diary"
                items={related}
                flush
                emptyCopy="No close neighbours for this seed in the current filter."
              />
            ) : null}
          </section>
        </>
      ) : null}
    </section>
  )
}

function TasteSection({
  title,
  subtitle,
  items,
  flush = false,
  emptyCopy = 'No films match these filters yet.',
}: {
  title: string
  subtitle?: string
  items: Array<{ film: FilmEntry; explanation: string }>
  flush?: boolean
  emptyCopy?: string
}) {
  const body = (
    <>
      {items.length === 0 ? <p className="empty-state">{emptyCopy}</p> : null}
      <div className="film-list">
        {items.map((item) => (
          <FilmCard key={item.film.id} film={item.film} explanation={item.explanation} />
        ))}
      </div>
    </>
  )

  if (flush) {
    return (
      <div className="taste-section taste-section--flush">
        <h4 className="taste-section__subtitle">{title}</h4>
        {body}
      </div>
    )
  }

  return (
    <section className="panel">
      <header className="panel__header">
        <h3 className="panel__title">{title}</h3>
        {subtitle ? <p className="panel__subtitle">{subtitle}</p> : null}
      </header>
      {body}
    </section>
  )
}
