import { useMemo, useState } from 'react'
import { useFilms } from '../hooks/useFilms'
import type { CreateFilmEntryInput, FilmEntry } from '../types/film'

// 2021-04-15: the rating-spree day that the previous Letterboxd ratings.csv
// import stamped onto 117 films. This page surfaces those plus any films
// imported with no watched date so the dates can be filled in by hand.
const SUSPECT_LETTERBOXD_DATE = '2021-04-15'

type Bucket = {
  id: 'missing' | 'suspect'
  title: string
  description: string
  films: FilmEntry[]
}

const buildInputFromFilm = (
  film: FilmEntry,
  nextDate: string,
): CreateFilmEntryInput => ({
  title: film.title,
  releaseYear: film.releaseYear,
  dateWatched: nextDate,
  rating: film.rating,
  notes: film.notes,
  tags: film.tags,
  metadata: film.metadata,
  isPublic: film.isPublic,
})

export function WatchDateBacklogPage() {
  const { films, isLoading, error, isSaving, updateFilm } = useFilms()
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [savingFilmId, setSavingFilmId] = useState<string | null>(null)
  const [statusByFilmId, setStatusByFilmId] = useState<
    Record<string, 'saved' | 'error' | undefined>
  >({})

  const buckets: Bucket[] = useMemo(() => {
    const missing: FilmEntry[] = []
    const suspect: FilmEntry[] = []
    for (const film of films) {
      if (!film.dateWatched) {
        missing.push(film)
      } else if (
        film.dateWatched === SUSPECT_LETTERBOXD_DATE &&
        film.metadata.source === 'letterboxd'
      ) {
        suspect.push(film)
      }
    }

    const byTitle = (a: FilmEntry, b: FilmEntry) => a.title.localeCompare(b.title)

    return [
      {
        id: 'missing',
        title: 'No watched date',
        description:
          'Films imported without a watched date (e.g. from Letterboxd ratings.csv after the importer fix). Set a real date or leave empty to defer.',
        films: [...missing].sort(byTitle),
      },
      {
        id: 'suspect',
        title: `Stamped ${SUSPECT_LETTERBOXD_DATE} (suspect)`,
        description:
          'Films stamped with the rating-spree date from a past Letterboxd import. Replace with the real watch date if you remember it.',
        films: [...suspect].sort(byTitle),
      },
    ]
  }, [films])

  const handleDraftChange = (filmId: string, value: string) => {
    setDrafts((current) => ({ ...current, [filmId]: value }))
    setStatusByFilmId((current) =>
      current[filmId] ? { ...current, [filmId]: undefined } : current,
    )
  }

  const handleSave = async (film: FilmEntry) => {
    const draft = drafts[film.id] ?? ''
    if (draft === film.dateWatched) return

    setSavingFilmId(film.id)
    setStatusByFilmId((current) => ({ ...current, [film.id]: undefined }))

    const ok = await updateFilm(film.id, buildInputFromFilm(film, draft))

    setSavingFilmId(null)
    setStatusByFilmId((current) => ({
      ...current,
      [film.id]: ok ? 'saved' : 'error',
    }))

    if (ok) {
      setDrafts((current) => {
        const next = { ...current }
        delete next[film.id]
        return next
      })
    }
  }

  const totalToFix = buckets.reduce((sum, bucket) => sum + bucket.films.length, 0)

  return (
    <section className="page">
      <header className="page__hero">
        <span className="eyebrow">Settings</span>
        <h2 className="page__title">Watch date backlog</h2>
        <p className="page__copy">
          Fix watched dates on films that came in without a real date. {totalToFix}{' '}
          {totalToFix === 1 ? 'film' : 'films'} flagged.
        </p>
      </header>

      {error ? <p className="alert alert--error">{error}</p> : null}
      {isLoading ? <p className="page__copy">Loading…</p> : null}

      {!isLoading
        ? buckets.map((bucket) => (
            <section className="shell-card" key={bucket.id} aria-label={bucket.title}>
              <h3>
                {bucket.title} ({bucket.films.length})
              </h3>
              <p className="page__copy">{bucket.description}</p>

              {bucket.films.length === 0 ? (
                <p className="page__copy">Nothing to clean up here. Nice.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Film</th>
                        <th>Year</th>
                        <th>Current date</th>
                        <th>New date</th>
                        <th></th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {bucket.films.map((film) => {
                        const draft = drafts[film.id] ?? film.dateWatched
                        const isRowSaving = savingFilmId === film.id
                        const status = statusByFilmId[film.id]
                        const isDirty = draft !== film.dateWatched

                        return (
                          <tr key={film.id}>
                            <td>
                              <strong>{film.title}</strong>
                            </td>
                            <td>{film.releaseYear ?? '—'}</td>
                            <td>{film.dateWatched || '—'}</td>
                            <td>
                              <input
                                type="date"
                                value={draft}
                                onChange={(event) =>
                                  handleDraftChange(film.id, event.target.value)
                                }
                                disabled={isRowSaving || isSaving}
                                aria-label={`New watched date for ${film.title}`}
                              />
                            </td>
                            <td>
                              <button
                                type="button"
                                className="button-primary"
                                disabled={!isDirty || isRowSaving || isSaving}
                                onClick={() => void handleSave(film)}
                              >
                                {isRowSaving ? 'Saving…' : 'Save'}
                              </button>
                            </td>
                            <td>
                              {status === 'saved' ? (
                                <span className="meta">Saved</span>
                              ) : null}
                              {status === 'error' ? (
                                <span className="meta" role="alert">
                                  Could not save
                                </span>
                              ) : null}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))
        : null}
    </section>
  )
}
