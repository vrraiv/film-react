import { useEffect, useState } from 'react'
import { normalizeTag } from '../config/filmOptions'
import {
  localFilmRepository,
  type FilmRepository,
} from '../lib/storage/filmRepository'
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
  addFilm: (input: CreateFilmEntryInput) => Promise<boolean>
  updateFilm: (filmId: string, input: CreateFilmEntryInput) => Promise<boolean>
  deleteFilm: (filmId: string) => Promise<boolean>
}

const defaultMetadata = (): FilmMetadata => ({
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

export const useFilms = (
  repository: FilmRepository = localFilmRepository,
): UseFilmsState => {
  const [films, setFilms] = useState<FilmEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSavedFilmId, setLastSavedFilmId] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      try {
        const nextFilms = await repository.loadFilms()

        if (isMounted) {
          setFilms(nextFilms)
        }
      } catch {
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
  }, [repository])

  const addFilm = async (input: CreateFilmEntryInput) => {
    setIsSaving(true)
    setError(null)

    const nextEntry = createFilmEntry(input)
    const nextFilms = [nextEntry, ...films].sort((left, right) =>
      right.dateWatched.localeCompare(left.dateWatched),
    )

    try {
      await repository.saveFilms(nextFilms)
      setFilms(nextFilms)
      setLastSavedFilmId(nextEntry.id)
      return true
    } catch {
      setError('We could not save that film. Try again.')
      return false
    } finally {
      setIsSaving(false)
    }
  }

  const updateFilm = async (filmId: string, input: CreateFilmEntryInput) => {
    setIsSaving(true)
    setError(null)

    const nextFilms = films
      .map((film) => (film.id === filmId ? buildFilmEntry(input, film.id) : film))
      .sort((left, right) => right.dateWatched.localeCompare(left.dateWatched))

    try {
      await repository.saveFilms(nextFilms)
      setFilms(nextFilms)
      setLastSavedFilmId(filmId)
      return true
    } catch {
      setError('We could not update that film. Try again.')
      return false
    } finally {
      setIsSaving(false)
    }
  }

  const deleteFilm = async (filmId: string) => {
    setIsSaving(true)
    setError(null)

    const nextFilms = films.filter((film) => film.id !== filmId)

    try {
      await repository.saveFilms(nextFilms)
      setFilms(nextFilms)
      if (lastSavedFilmId === filmId) {
        setLastSavedFilmId(null)
      }
      return true
    } catch {
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
    addFilm,
    updateFilm,
    deleteFilm,
  }
}
