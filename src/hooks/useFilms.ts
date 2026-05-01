import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { normalizeTag } from '../config/filmOptions'
import { createFilmLogService, type FilmLogService } from '../services/filmLogService'
import type {
  CreateFilmEntryInput,
  FilmEntry,
  FilmMetadata,
} from '../types/film'

type UseFilmsState = {
  films: FilmEntry[]
  isLoading: boolean
  isSaving: boolean
  error: string | null
  lastSavedFilmId: string | null
  reloadFilms: () => Promise<void>
  addFilm: (input: CreateFilmEntryInput) => Promise<boolean>
  updateFilm: (filmId: string, input: CreateFilmEntryInput) => Promise<boolean>
  deleteFilm: (filmId: string) => Promise<boolean>
}

const defaultMetadata = (): FilmMetadata => ({
  dateLogged: '',
  firstWatch: null,
  watchContext: '',
  watchContextNote: '',
  ownedFormats: [],
  onWishlist: false,
})

const normalizeTags = (tags: string[] = []) =>
  [...new Set(tags.map((tag) => normalizeTag(tag)).filter(Boolean))]

const buildFilmEntry = (input: CreateFilmEntryInput, id: string): FilmEntry => ({
  id,
  title: input.title.trim(),
  releaseYear: input.releaseYear ?? null,
  dateWatched: input.dateWatched,
  rating: input.rating,
  tags: normalizeTags(input.tags),
  metadata: {
    ...defaultMetadata(),
    ...input.metadata,
    dateLogged: input.metadata?.dateLogged ?? new Date().toISOString(),
    firstWatch: input.metadata?.firstWatch ?? null,
    watchContextNote: input.metadata?.watchContextNote?.trim() ?? '',
    ownedFormats: [...new Set(input.metadata?.ownedFormats ?? [])],
    onWishlist: input.metadata?.onWishlist ?? false,
  },
  notes: input.notes.trim(),
  isPublic: input.isPublic ?? false,
})

const createFilmEntry = (input: CreateFilmEntryInput): FilmEntry =>
  buildFilmEntry(
    input,
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  )

export const useFilms = (serviceOverride?: FilmLogService): UseFilmsState => {
  const { user, loading: authLoading } = useAuth()
  const service = useMemo(
    () => serviceOverride ?? createFilmLogService(user?.id ?? null),
    [serviceOverride, user?.id],
  )
  const [films, setFilms] = useState<FilmEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSavedFilmId, setLastSavedFilmId] = useState<string | null>(null)

  const reloadFilms = async () => {
    setIsLoading(true)
    setError(null)

    try {
      setFilms(await service.fetchEntries())
    } catch (loadError) {
      console.error(loadError)
      setError('We could not load your film log.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (authLoading && !serviceOverride) {
      setIsLoading(true)
      return
    }

    let isMounted = true

    const load = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const nextFilms = await service.fetchEntries()

        if (isMounted) {
          setFilms(nextFilms)
        }
      } catch (loadError) {
        console.error(loadError)
        if (isMounted) {
          setError('We could not load your film log.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void load()

    return () => {
      isMounted = false
    }
  }, [authLoading, service, serviceOverride])

  const addFilm = async (input: CreateFilmEntryInput) => {
    setIsSaving(true)
    setError(null)

    const nextEntry = createFilmEntry(input)

    try {
      const savedEntry = await service.createEntry(nextEntry)
      const nextFilms = [savedEntry, ...films].sort((left, right) =>
        right.dateWatched.localeCompare(left.dateWatched),
      )
      setFilms(nextFilms)
      setLastSavedFilmId(savedEntry.id)
      return true
    } catch (saveError) {
      console.error(saveError)
      setError('We could not save that film. Try again.')
      return false
    } finally {
      setIsSaving(false)
    }
  }

  const updateFilm = async (filmId: string, input: CreateFilmEntryInput) => {
    setIsSaving(true)
    setError(null)

    const existingFilm = films.find((film) => film.id === filmId)

    if (!existingFilm) {
      setError('We could not find that film.')
      setIsSaving(false)
      return false
    }

    const nextEntry = buildFilmEntry(
      {
        ...input,
        metadata: {
          ...input.metadata,
          dateLogged: existingFilm.metadata.dateLogged,
        },
      },
      existingFilm.id,
    )

    try {
      const savedEntry = await service.updateEntry(nextEntry)
      const nextFilms = films
        .map((film) => (film.id === filmId ? savedEntry : film))
        .sort((left, right) => right.dateWatched.localeCompare(left.dateWatched))
      setFilms(nextFilms)
      setLastSavedFilmId(filmId)
      return true
    } catch (saveError) {
      console.error(saveError)
      setError('We could not update that film. Try again.')
      return false
    } finally {
      setIsSaving(false)
    }
  }

  const deleteFilm = async (filmId: string) => {
    setIsSaving(true)
    setError(null)

    try {
      await service.deleteEntry(filmId)
      const nextFilms = films.filter((film) => film.id !== filmId)
      setFilms(nextFilms)
      if (lastSavedFilmId === filmId) {
        setLastSavedFilmId(null)
      }
      return true
    } catch (saveError) {
      console.error(saveError)
      setError('We could not delete that film. Try again.')
      return false
    } finally {
      setIsSaving(false)
    }
  }

  return {
    films,
    isLoading,
    isSaving,
    error,
    lastSavedFilmId,
    reloadFilms,
    addFilm,
    updateFilm,
    deleteFilm,
  }
}
