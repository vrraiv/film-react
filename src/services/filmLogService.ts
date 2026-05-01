import { localFilmRepository } from '../lib/storage/filmRepository'
import { mapFilmEntryToRow, mapRowToFilmEntry, type FilmEntryRow } from '../lib/supabase/filmMappers'
import { supabase } from '../lib/supabaseClient'
import type { FilmEntry } from '../types/film'

export interface FilmLogService {
  fetchEntries: () => Promise<FilmEntry[]>
  createEntry: (entry: FilmEntry) => Promise<FilmEntry>
  updateEntry: (entry: FilmEntry) => Promise<FilmEntry>
  deleteEntry: (entryId: string) => Promise<void>
}

const filmEntryColumns = `
  id,
  user_id,
  title,
  release_year,
  date_watched,
  rating,
  tags,
  notes,
  is_public,
  metadata
`

const sortEntries = (entries: FilmEntry[]) =>
  [...entries].sort((left, right) => right.dateWatched.localeCompare(left.dateWatched))

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const createEntryId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  throw new Error('Could not create a UUID for this film entry.')
}

const ensureSupabaseEntryId = (entry: FilmEntry): FilmEntry =>
  uuidPattern.test(entry.id) ? entry : { ...entry, id: createEntryId() }

class LocalFilmLogService implements FilmLogService {
  async fetchEntries() {
    return localFilmRepository.loadFilms()
  }

  async createEntry(entry: FilmEntry) {
    const entries = await localFilmRepository.loadFilms()
    await localFilmRepository.saveFilms(sortEntries([entry, ...entries]))
    return entry
  }

  async updateEntry(entry: FilmEntry) {
    const entries = await localFilmRepository.loadFilms()
    const nextEntries = entries.map((currentEntry) =>
      currentEntry.id === entry.id ? entry : currentEntry,
    )

    await localFilmRepository.saveFilms(sortEntries(nextEntries))
    return entry
  }

  async deleteEntry(entryId: string) {
    const entries = await localFilmRepository.loadFilms()
    await localFilmRepository.saveFilms(entries.filter((entry) => entry.id !== entryId))
  }
}

class SupabaseFilmLogService implements FilmLogService {
  private readonly userId: string

  constructor(userId: string) {
    this.userId = userId
  }

  async fetchEntries() {
    const { data, error } = await supabase
      .from('film_entries')
      .select(filmEntryColumns)
      .eq('user_id', this.userId)
      .order('date_watched', { ascending: false })
      .returns<FilmEntryRow[]>()

    if (error) {
      throw new Error(`Could not load film entries: ${error.message}`)
    }

    return data.map(mapRowToFilmEntry)
  }

  async createEntry(entry: FilmEntry) {
    const entryToCreate = ensureSupabaseEntryId(entry)
    const { data, error } = await supabase
      .from('film_entries')
      .insert(mapFilmEntryToRow(entryToCreate, this.userId))
      .select(filmEntryColumns)
      .single()
      .returns<FilmEntryRow>()

    if (error) {
      throw new Error(`Could not create film entry: ${error.message}`)
    }

    return mapRowToFilmEntry(data)
  }

  async updateEntry(entry: FilmEntry) {
    const { data, error } = await supabase
      .from('film_entries')
      .update(mapFilmEntryToRow(entry, this.userId))
      .eq('id', entry.id)
      .eq('user_id', this.userId)
      .select(filmEntryColumns)
      .single()
      .returns<FilmEntryRow>()

    if (error) {
      throw new Error(`Could not update film entry: ${error.message}`)
    }

    return mapRowToFilmEntry(data)
  }

  async deleteEntry(entryId: string) {
    const { error } = await supabase
      .from('film_entries')
      .delete()
      .eq('id', entryId)
      .eq('user_id', this.userId)

    if (error) {
      throw new Error(`Could not delete film entry: ${error.message}`)
    }
  }
}

export const localFilmLogService: FilmLogService = new LocalFilmLogService()

export const createSupabaseFilmLogService = (userId: string): FilmLogService =>
  new SupabaseFilmLogService(userId)

export const createFilmLogService = (userId: string | null): FilmLogService =>
  userId ? createSupabaseFilmLogService(userId) : localFilmLogService
