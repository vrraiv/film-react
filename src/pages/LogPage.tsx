import { useEffect, useMemo, useRef, useState } from 'react'
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
import type { CreateFilmEntryInput, FilmEntry } from '../types/film'

type RecentSort = 'recent' | 'rating-high' | 'oldest'

type RecentFilters = {
  query: string
  tag: string
  minimumRating: string
  sort: RecentSort
}

const defaultRecentFilters: RecentFilters = {
  query: '',
  tag: '',
  minimumRating: '',
  sort: 'recent',
}

const isDefaultRecent = (filters: RecentFilters) =>
  filters.query === defaultRecentFilters.query &&
  filters.tag === defaultRecentFilters.tag &&
  filters.minimumRating === defaultRecentFilters.minimumRating &&
  filters.sort === defaultRecentFilters.sort

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
  const [recentFilters, setRecentFilters] = useState<RecentFilters>(defaultRecentFilters)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
  const [recentlyDeleted, setRecentlyDeleted] = useState<FilmEntry | null>(null)
  const [highlightedFilmId, setHighlightedFilmId] = useState<string | null>(null)
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const enrichmentDialogRef = useRef<HTMLDialogElement>(null)
  const enrichmentTriggerRef = useRef<HTMLButtonElement>(null)
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
      } catch {
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

  useEffect(() => () => {
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current)
    }
    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!lastSavedFilmId) return
    setHighlightedFilmId(lastSavedFilmId)
    const target = document.getElementById(`film-entry-${lastSavedFilmId}`)
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current)
    }
    highlightTimerRef.current = setTimeout(() => {
      setHighlightedFilmId(null)
      highlightTimerRef.current = null
    }, 2200)
  }, [lastSavedFilmId])

  useEffect(() => {
    const dialog = enrichmentDialogRef.current
    if (!dialog) return
    if (showEnrichment && !dialog.open) {
      dialog.showModal()
    } else if (!showEnrichment && dialog.open) {
      dialog.close()
    }
  }, [showEnrichment])

  const handleCloseEnrichmentDialog = () => {
    if (showEnrichment) {
      setShowEnrichment(false)
      enrichmentTriggerRef.current?.focus()
    }
  }

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
    } catch {
      setLocalImportError('We could not import your local films. Try again.')
    } finally {
      setIsImportingLocalFilms(false)
    }
  }

  const requestDelete = (film: FilmEntry) => {
    setConfirmingDeleteId(film.id)
  }

  const cancelDelete = () => {
    setConfirmingDeleteId(null)
  }

  const confirmDelete = async (film: FilmEntry) => {
    setConfirmingDeleteId(null)
    const succeeded = await deleteFilm(film.id)
    if (!succeeded) return

    if (editingFilm?.id === film.id) {
      setEditingFilm(null)
    }

    setRecentlyDeleted(film)
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current)
    }
    undoTimerRef.current = setTimeout(() => {
      setRecentlyDeleted(null)
      undoTimerRef.current = null
    }, 6000)
  }

  const undoDelete = async () => {
    if (!recentlyDeleted) return
    const restoreInput: CreateFilmEntryInput = {
      title: recentlyDeleted.title,
      releaseYear: recentlyDeleted.releaseYear,
      dateWatched: recentlyDeleted.dateWatched,
      rating: recentlyDeleted.rating,
      tags: recentlyDeleted.tags,
      notes: recentlyDeleted.notes,
      isPublic: recentlyDeleted.isPublic,
      metadata: { ...recentlyDeleted.metadata },
    }
    setRecentlyDeleted(null)
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current)
      undoTimerRef.current = null
    }
    await addFilm(restoreInput)
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
    } catch {
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
    } catch {
      setEnrichmentError('Could not link this entry. Please try again.')
    } finally {
      setIsLinkingEntry(false)
    }
  }

  const filteredFilms = useMemo(() => {
    const query = recentFilters.query.trim().toLowerCase()
    const tag = recentFilters.tag.trim().toLowerCase()
    const minimumRating = recentFilters.minimumRating ? Number(recentFilters.minimumRating) : null

    const matched = films.filter((film) => {
      if (query && !film.title.toLowerCase().includes(query)) return false
      if (tag && !film.tags.some((value) => value.toLowerCase().includes(tag))) return false
      if (minimumRating !== null && (film.rating === null || film.rating < minimumRating)) return false
      return true
    })

    return [...matched].sort((left, right) => {
      switch (recentFilters.sort) {
        case 'rating-high':
          return (right.rating ?? -Infinity) - (left.rating ?? -Infinity)
        case 'oldest':
          return left.dateWatched.localeCompare(right.dateWatched)
        case 'recent':
        default:
          return right.dateWatched.localeCompare(left.dateWatched)
      }
    })
  }, [films, recentFilters])

  const recentFiltersAreDefault = isDefaultRecent(recentFilters)

  if (!user) {
    return <p className="empty-state">Checking your session…</p>
  }

  return (
    <section className="page">
      <header className="page__hero">
        <span className="eyebrow">Log</span>
        <h2 className="page__title">{editingFilm ? 'Edit a log entry.' : 'Log a film.'}</h2>
        <p className="page__copy">
          Capture the essentials while the film is still fresh &mdash; tags,
          ratings, and notes you&apos;ll thank yourself for later.
        </p>
      </header>

      {showLocalImport ? (
        <section className="panel">
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
            {isImportingLocalFilms ? 'Importing…' : 'Import to Supabase'}
          </button>
        </section>
      ) : null}

      {localImportMessage ? <p className="alert alert--success">{localImportMessage}</p> : null}
      {localImportError ? <p className="alert alert--error" role="alert">{localImportError}</p> : null}

      {recentlyDeleted ? (
        <div className="alert alert--success" role="status">
          Deleted &ldquo;{recentlyDeleted.title}&rdquo;.
          <div className="alert__actions">
            <button className="button-secondary" type="button" onClick={() => void undoDelete()}>
              Undo
            </button>
          </div>
        </div>
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

          {error ? <p className="alert alert--error" role="alert">{error}</p> : null}
        </section>

        <section className="panel">
          <header className="panel__header">
            <h3 className="panel__title">Recent films</h3>
            <p className="page__copy">Browse your most recently logged films.</p>
          </header>

          <div className="filter-grid filter-grid--compact">
            <div className="field">
              <label htmlFor="recentSearch">Title keyword</label>
              <input
                id="recentSearch"
                type="text"
                value={recentFilters.query}
                placeholder="e.g. mood for love"
                onChange={(event) =>
                  setRecentFilters((current) => ({ ...current, query: event.target.value }))
                }
              />
            </div>
            <div className="field">
              <label htmlFor="recentTag">Tag</label>
              <input
                id="recentTag"
                type="text"
                value={recentFilters.tag}
                placeholder="manual tag search"
                onChange={(event) =>
                  setRecentFilters((current) => ({ ...current, tag: event.target.value }))
                }
              />
            </div>
            <div className="field">
              <label htmlFor="recentMinRating">Minimum rating</label>
              <select
                id="recentMinRating"
                value={recentFilters.minimumRating}
                onChange={(event) =>
                  setRecentFilters((current) => ({ ...current, minimumRating: event.target.value }))
                }
              >
                <option value="">Any rating</option>
                <option value="5">5.0</option>
                <option value="4.5">4.5</option>
                <option value="4">4.0</option>
                <option value="3.5">3.5</option>
                <option value="3">3.0</option>
                <option value="2.5">2.5</option>
                <option value="2">2.0</option>
                <option value="1.5">1.5</option>
                <option value="1">1.0</option>
                <option value="0.5">0.5</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="recentSort">Sort</label>
              <select
                id="recentSort"
                value={recentFilters.sort}
                onChange={(event) =>
                  setRecentFilters((current) => ({ ...current, sort: event.target.value as RecentSort }))
                }
              >
                <option value="recent">Recently watched</option>
                <option value="rating-high">Highest rated</option>
                <option value="oldest">Oldest watched</option>
              </select>
            </div>
          </div>

          <div className="filter-summary">
            <p className="meta">
              {filteredFilms.length} of {films.length} logged films
            </p>
            <button
              className="button-secondary"
              type="button"
              onClick={() => setRecentFilters(defaultRecentFilters)}
              disabled={recentFiltersAreDefault}
            >
              Reset filters
            </button>
          </div>

          <FilmList
            films={filteredFilms}
            isLoading={isLoading}
            confirmingDeleteId={confirmingDeleteId}
            highlightedFilmId={highlightedFilmId}
            onEdit={setEditingFilm}
            onRequestDelete={requestDelete}
            onConfirmDelete={(film) => void confirmDelete(film)}
            onCancelDelete={cancelDelete}
            isFiltered={!recentFiltersAreDefault}
            totalCount={films.length}
          />
        </section>
      </div>

      <details className="panel panel--collapsible">
        <summary className="panel__summary">Improve metadata for older entries</summary>
        <div className="panel__collapsible-body">
          <p className="page__copy">
            {filmsWithoutTmdb.length} {filmsWithoutTmdb.length === 1 ? 'entry is' : 'entries are'} missing TMDb metadata.
            Review-only workflow &mdash; nothing is linked unless you confirm each match.
          </p>
          <div className="button-row">
            <button
              ref={enrichmentTriggerRef}
              className="button-secondary"
              type="button"
              onClick={handleOpenEnrichmentQueue}
              disabled={filmsWithoutTmdb.length === 0}
            >
              {showEnrichment ? 'Restart queue' : 'Open enrichment queue'}
            </button>
          </div>
        </div>
      </details>

      <dialog
        ref={enrichmentDialogRef}
        className="enrichment-dialog"
        aria-labelledby="enrichment-dialog-title"
        onClose={handleCloseEnrichmentDialog}
      >
        <header className="enrichment-dialog__header">
          <div>
            <h3 id="enrichment-dialog-title" className="panel__title">Enrichment review queue</h3>
            <p className="meta">
              Progress: {Math.min(queueIndex, pendingEntries.length)} / {pendingEntries.length} reviewed &middot; {linkedCount} linked &middot; {skippedCount} skipped
            </p>
          </div>
          <button
            className="button-secondary"
            type="button"
            onClick={() => enrichmentDialogRef.current?.close()}
            aria-label="Close enrichment queue"
          >
            Close
          </button>
        </header>
        <div className="enrichment-dialog__body">
          {currentQueueEntry ? (
            <div className="field">
              <p>
                <strong>Entry title:</strong> {currentQueueEntry.title}
              </p>
              <div className="button-row">
                <input
                  className="tmdb-search-input"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search TMDb title"
                />
                <button
                  className="button-secondary"
                  type="button"
                  onClick={() => void handleSearchCandidates()}
                  disabled={isSearchingCandidates}
                >
                  {isSearchingCandidates ? 'Searching…' : 'Search again'}
                </button>
                <button className="button-secondary" type="button" onClick={handleSkipEntry}>
                  Skip
                </button>
              </div>
              {candidateResults.length > 0 ? (
                <div className="tmdb-results">
                  {candidateResults.map((candidate) => (
                    <button
                      key={candidate.id}
                      type="button"
                      className="tmdb-result"
                      disabled={isLinkingEntry}
                      onClick={() => void handleLinkEntry(candidate)}
                    >
                      {candidate.poster_path ? (
                        <img
                          className="tmdb-result__poster"
                          src={`https://image.tmdb.org/t/p/w92${candidate.poster_path}`}
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
                          {candidate.title}
                          {candidate.release_date ? ` (${candidate.release_date.slice(0, 4)})` : ''}
                        </p>
                        <p className="tmdb-result__meta">
                          {candidate.overview?.trim() || 'No overview provided by TMDb.'}
                        </p>
                      </div>
                      <span className="tmdb-result__cta">
                        {isLinkingEntry ? 'Linking…' : 'Link'}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
              {candidateResults.length === 0 && !isSearchingCandidates ? (
                <button
                  className="button-secondary"
                  type="button"
                  onClick={() => void handleSearchCandidates(currentQueueEntry.title)}
                >
                  Search TMDb for this title
                </button>
              ) : null}
            </div>
          ) : (
            <p className="status-message">Queue complete. Linked {linkedCount} entries and skipped {skippedCount}.</p>
          )}
          {enrichmentError ? <p className="alert alert--error" role="alert">{enrichmentError}</p> : null}
        </div>
      </dialog>
    </section>
  )
}
