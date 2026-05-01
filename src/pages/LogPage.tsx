import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { FilmFilters, type FilmFiltersState } from '../components/FilmFilters'
import { FilmForm } from '../components/FilmForm'
import { FilmList } from '../components/FilmList'
import { useFilms } from '../hooks/useFilms'
import { createSupabaseFilmLogService } from '../services/filmLogService'
import {
  getLocalFilmImportStatus,
  importLocalFilmsToService,
} from '../services/localFilmImportService'
import type { FilmEntry } from '../types/film'

const defaultFilters: FilmFiltersState = {
  selectedTag: '',
  minimumRating: '',
  watchContext: '',
}

export function LogPage() {
  const { user } = useAuth()
  const filmLogService = useMemo(
    () => (user ? createSupabaseFilmLogService(user.id) : undefined),
    [user?.id],
  )
  const { films, isLoading, isSaving, error, lastSavedFilmId, reloadFilms, addFilm, updateFilm, deleteFilm } = useFilms(filmLogService)
  const [filters, setFilters] = useState<FilmFiltersState>(defaultFilters)
  const [editingFilm, setEditingFilm] = useState<FilmEntry | null>(null)
  const [localImportCount, setLocalImportCount] = useState(0)
  const [showLocalImport, setShowLocalImport] = useState(false)
  const [isCheckingLocalImport, setIsCheckingLocalImport] = useState(false)
  const [isImportingLocalFilms, setIsImportingLocalFilms] = useState(false)
  const [localImportMessage, setLocalImportMessage] = useState<string | null>(null)
  const [localImportError, setLocalImportError] = useState<string | null>(null)
  const latestSavedFilm = films.find((film) => film.id === lastSavedFilmId)

  const filteredFilms = useMemo(() => {
    const minimumRating = filters.minimumRating
      ? Number(filters.minimumRating)
      : null

    return films.filter((film) => {
      if (filters.selectedTag && !film.tags.includes(filters.selectedTag)) {
        return false
      }

      if (minimumRating !== null && (film.rating === null || film.rating < minimumRating)) {
        return false
      }

      if (
        filters.watchContext &&
        film.metadata.watchContext !== filters.watchContext
      ) {
        return false
      }

      return true
    })
  }, [films, filters])

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
            <p className="page__copy">
              Filter by taste tag, rating, or watch context without blending those
              non-taste details into the recommendation layer.
            </p>
          </header>

          <FilmFilters filters={filters} onChange={setFilters} />
          <p className="meta">
            Showing {filteredFilms.length} of {films.length} logged films.
          </p>

          <FilmList
            films={filteredFilms}
            isLoading={isLoading}
            onEdit={setEditingFilm}
            onDelete={handleDeleteFilm}
          />
        </section>
      </div>
    </section>
  )
}
