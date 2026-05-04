import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { FilmForm } from '../components/FilmForm'
import { FilmList } from '../components/FilmList'
import { useFilms } from '../hooks/useFilms'
import { createSupabaseFilmLogService } from '../services/filmLogService'
import {
  getLocalFilmImportStatus,
  importLocalFilmsToService,
} from '../services/localFilmImportService'
import { fetchTmdbMovieDetails, searchTmdbMovies, type TmdbSearchResult } from '../services/tmdbService'
import type { FilmEntry } from '../types/film'

export function LogPage() {
  const { user } = useAuth()
  const filmLogService = useMemo(
    () => (user ? createSupabaseFilmLogService(user.id) : undefined),
    [user?.id],
  )
  const { films, isLoading, isSaving, error, lastSavedFilmId, reloadFilms, addFilm, updateFilm, deleteFilm } = useFilms(filmLogService)
  const [editingFilm, setEditingFilm] = useState<FilmEntry | null>(null)
  const [localImportCount, setLocalImportCount] = useState(0)
  const [showLocalImport, setShowLocalImport] = useState(false)
  const [isCheckingLocalImport, setIsCheckingLocalImport] = useState(false)
  const [isImportingLocalFilms, setIsImportingLocalFilms] = useState(false)
  const [localImportMessage, setLocalImportMessage] = useState<string | null>(null)
  const [localImportError, setLocalImportError] = useState<string | null>(null)
  const [showEnrichment, setShowEnrichment] = useState(false)
  const [pendingEntries, setPendingEntries] = useState<FilmEntry[]>([])
  const [queueIndex, setQueueIndex] = useState(0)
  const [candidateResults, setCandidateResults] = useState<TmdbSearchResult[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isSearchingCandidates, setIsSearchingCandidates] = useState(false)
  const [isLinkingEntry, setIsLinkingEntry] = useState(false)
  const [linkedCount, setLinkedCount] = useState(0)
  const [skippedCount, setSkippedCount] = useState(0)
  const [enrichmentError, setEnrichmentError] = useState<string | null>(null)
  const latestSavedFilm = films.find((film) => film.id === lastSavedFilmId)
  const filmsWithoutTmdb = useMemo(
    () => films.filter((film) => !film.metadata.tmdb?.id),
    [films],
  )
  const currentQueueEntry = pendingEntries[queueIndex] ?? null

  useEffect(() => {
    let isMounted = true

    const loadLocalImportStatus = async () => {
      setIsCheckingLocalImport(true)
      setLocalImportError(null)

      if (!user) {
        setLocalImportCount(0)
        setShowLocalImport(false)
        setIsCheckingLocalImport(false)
        return
      }

      try {
        const status = await getLocalFilmImportStatus(user.id)

        if (isMounted) {
          setLocalImportCount(status.entries.length)
          setShowLocalImport(status.entries.length > 0 && !status.isImported)
        }
      } catch (statusError) {
        console.error(statusError)

        if (isMounted) {
          setLocalImportError('We could not check for local films to import.')
          setShowLocalImport(false)
        }
      } finally {
        if (isMounted) {
          setIsCheckingLocalImport(false)
        }
      }
    }

    void loadLocalImportStatus()

    return () => {
      isMounted = false
    }
  }, [user?.id])

  useEffect(() => {
    if (!showEnrichment || !currentQueueEntry) {
      return
    }

    setSearchTerm(currentQueueEntry.title)
    setCandidateResults([])
    setEnrichmentError(null)
  }, [showEnrichment, queueIndex, currentQueueEntry?.id])

  const handleImportLocalFilms = async () => {
    if (!user || !filmLogService) {
      return
    }

    setIsImportingLocalFilms(true)
    setLocalImportError(null)
    setLocalImportMessage(null)

    try {
      const result = await importLocalFilmsToService(user.id, filmLogService)
      setShowLocalImport(false)
      setLocalImportMessage(
        result.skippedCount > 0
          ? `Imported ${result.importedCount} local films. Skipped ${result.skippedCount} already in Supabase.`
          : `Imported ${result.importedCount} local films.`,
      )
      await reloadFilms()
    } catch (importError) {
      console.error(importError)
      setLocalImportError('We could not import your local films. Try again.')
    } finally {
      setIsImportingLocalFilms(false)
    }
  }

  const handleDeleteFilm = async (film: FilmEntry) => {
    const shouldDelete = window.confirm(`Delete "${film.title}" from your log?`)
    if (!shouldDelete) {
      return
    }

    await deleteFilm(film.id)
    if (editingFilm?.id === film.id) {
      setEditingFilm(null)
    }
  }

  const handleOpenEnrichmentQueue = () => {
    setPendingEntries(filmsWithoutTmdb)
    setQueueIndex(0)
    setLinkedCount(0)
    setSkippedCount(0)
    setCandidateResults([])
    setEnrichmentError(null)
    setShowEnrichment(true)
  }

  const handleSearchCandidates = async (queryOverride?: string) => {
    const query = (queryOverride ?? searchTerm).trim()
    if (!query) {
      return
    }

    setIsSearchingCandidates(true)
    setEnrichmentError(null)
    try {
      const results = await searchTmdbMovies(query)
      setCandidateResults(results)
    } catch (candidateError) {
      console.error(candidateError)
      setEnrichmentError('Could not search TMDb right now.')
    } finally {
      setIsSearchingCandidates(false)
    }
  }

  const moveToNextQueueEntry = () => {
    setQueueIndex((current) => current + 1)
    setCandidateResults([])
  }

  const handleSkipEntry = () => {
    setSkippedCount((current) => current + 1)
    moveToNextQueueEntry()
  }

  const handleLinkEntry = async (candidate: TmdbSearchResult) => {
    if (!currentQueueEntry) {
      return
    }

    setIsLinkingEntry(true)
    setEnrichmentError(null)
    try {
      const details = await fetchTmdbMovieDetails(candidate.id)
      await updateFilm(currentQueueEntry.id, {
        title: currentQueueEntry.title,
        releaseYear: currentQueueEntry.releaseYear,
        dateWatched: currentQueueEntry.dateWatched,
        rating: currentQueueEntry.rating,
        notes: currentQueueEntry.notes,
        tags: currentQueueEntry.tags,
        isPublic: currentQueueEntry.isPublic,
        metadata: {
          ...currentQueueEntry.metadata,
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
        },
      })
      setLinkedCount((current) => current + 1)
      moveToNextQueueEntry()
    } catch (linkError) {
      console.error(linkError)
      setEnrichmentError('Could not link this entry. Please try again.')
    } finally {
      setIsLinkingEntry(false)
    }
  }

  if (!user) {
    return <p className="empty-state">Checking your session...</p>
  }

  return (
    <section className="page">
      <header className="page__hero">
        <span className="eyebrow">Log</span>
        <h2 className="page__title">Capture the essentials while the film is still fresh.</h2>
        <p className="page__copy">
          This first flow now separates taste tags from viewing metadata, so future
          recommendations can focus on what you love rather than where you watched it.
        </p>
      </header>

      {showLocalImport ? (
        <section className="panel import-panel">
          <div className="panel__header">
            <h3 className="panel__title">Import local films</h3>
            <p className="page__copy">
              Found {localImportCount} local {localImportCount === 1 ? 'entry' : 'entries'} from the earlier version of the app.
            </p>
          </div>
          <button
            className="button-primary"
            type="button"
            disabled={isImportingLocalFilms || isCheckingLocalImport}
            onClick={() => void handleImportLocalFilms()}
          >
            {isImportingLocalFilms ? 'Importing...' : 'Import to Supabase'}
          </button>
        </section>
      ) : null}

      {localImportMessage ? <p className="status-message">{localImportMessage}</p> : null}
      {localImportError ? <p className="empty-state">{localImportError}</p> : null}

      <section className="panel import-panel">
        <div className="panel__header">
          <h3 className="panel__title">Developer tool: Enrich existing entries</h3>
          <p className="page__copy">
            Review-only workflow for linking TMDb metadata to existing entries.
            Nothing is linked unless you confirm each match.
          </p>
          <p className="meta">
            {filmsWithoutTmdb.length} {filmsWithoutTmdb.length === 1 ? 'entry' : 'entries'} missing TMDb IDs.
          </p>
        </div>
        <button
          className="button-secondary"
          type="button"
          onClick={handleOpenEnrichmentQueue}
          disabled={filmsWithoutTmdb.length === 0}
        >
          Enrich existing entries
        </button>
      </section>

      {showEnrichment ? (
        <section className="panel">
          <header className="panel__header">
            <h3 className="panel__title">Enrichment review queue</h3>
            <p className="meta">
              Progress: {Math.min(queueIndex, pendingEntries.length)} / {pendingEntries.length} reviewed · {linkedCount} linked · {skippedCount} skipped
            </p>
          </header>
          {currentQueueEntry ? (
            <div className="field">
              <p><strong>Entry title:</strong> {currentQueueEntry.title}</p>
              <div className="button-row">
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search TMDb title"
                />
                <button className="button-secondary" type="button" onClick={() => void handleSearchCandidates()} disabled={isSearchingCandidates}>
                  {isSearchingCandidates ? 'Searching...' : 'Search Again'}
                </button>
                <button className="button-secondary" type="button" onClick={handleSkipEntry}>
                  Skip
                </button>
              </div>
              <div className="tag-row">
                {candidateResults.map((candidate) => (
                  <article key={candidate.id} className="panel" style={{ margin: '0.5rem 0', width: '100%' }}>
                    <p><strong>{candidate.title}</strong> {candidate.release_date ? `(${candidate.release_date.slice(0, 4)})` : ''}</p>
                    <p className="meta">Poster: {candidate.poster_path ? `https://image.tmdb.org/t/p/w342${candidate.poster_path}` : 'None'}</p>
                    <p>{candidate.overview?.trim() ? candidate.overview : 'No overview provided by TMDb.'}</p>
                    <button className="button-primary" type="button" disabled={isLinkingEntry} onClick={() => void handleLinkEntry(candidate)}>
                      {isLinkingEntry ? 'Linking...' : 'Link'}
                    </button>
                  </article>
                ))}
              </div>
              {candidateResults.length === 0 && !isSearchingCandidates ? (
                <button className="button-secondary" type="button" onClick={() => void handleSearchCandidates(currentQueueEntry.title)}>
                  Search TMDb for this title
                </button>
              ) : null}
            </div>
          ) : (
            <p className="status-message">Queue complete. Linked {linkedCount} entries and skipped {skippedCount}.</p>
          )}
          {enrichmentError ? <p className="empty-state">{enrichmentError}</p> : null}
        </section>
      ) : null}

      <div className="log-grid">
        <section className="panel">
          <header className="panel__header">
            <h3 className="panel__title">{editingFilm ? 'Edit entry' : 'New entry'}</h3>
            <p className="page__copy">
              Taste lives in the tag system. Practical details like watch context,
              ownership, and wishlist status stay separate.
            </p>
          </header>

          <FilmForm
            key={editingFilm?.id ?? 'new'}
            isSaving={isSaving}
            onSubmit={(input) =>
              editingFilm ? updateFilm(editingFilm.id, input) : addFilm(input)
            }
            initialValues={editingFilm ?? undefined}
            submitLabel={editingFilm ? 'Save changes' : 'Add film'}
            onCancel={editingFilm ? () => setEditingFilm(null) : undefined}
          />

          {error ? <p className="empty-state">{error}</p> : null}
          {latestSavedFilm ? (
            <p className="status-message">
              Saved "{latestSavedFilm.title}" to your log.
            </p>
          ) : null}
        </section>

        <section className="panel">
          <header className="panel__header">
            <h3 className="panel__title">Recent films</h3>
            <p className="page__copy">Browse your most recently logged films.</p>
          </header>
          <p className="meta">Showing {films.length} logged films.</p>

          <FilmList
            films={films}
            isLoading={isLoading}
            onEdit={setEditingFilm}
            onDelete={handleDeleteFilm}
          />
        </section>
      </div>
    </section>
  )
}
