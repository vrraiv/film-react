import type { FilmEntry, FilmMetadata } from '../types/film'
import { supabase } from '../lib/supabaseClient'

type PublicProfileRow = {
  id: string
  display_name: string | null
  username: string
}

type PublicFilmEntryRow = {
  id: string
  title: string
  release_year: number | null
  date_watched: string
  rating: number | null
  tags: string[]
  notes: string
  is_public: boolean
}

export type PublicFilmProfile = {
  displayName: string
  username: string
  entries: FilmEntry[]
}

const publicFilmEntryColumns = `
  id,
  title,
  release_year,
  date_watched,
  rating,
  tags,
  notes,
  is_public
`

const defaultPublicMetadata = (): FilmMetadata => ({
  dateLogged: '',
  firstWatch: null,
  watchContext: '',
  watchContextNote: '',
  ownedFormats: [],
  onWishlist: false,
})

const mapPublicRowToFilmEntry = (row: PublicFilmEntryRow): FilmEntry => ({
  id: row.id,
  title: row.title,
  releaseYear: row.release_year,
  dateWatched: row.date_watched,
  rating: row.rating,
  tags: row.tags,
  notes: row.notes,
  isPublic: row.is_public,
  metadata: defaultPublicMetadata(),
})

export const fetchPublicFilmProfile = async (
  username: string,
): Promise<PublicFilmProfile | null> => {
  const normalizedUsername = username.trim().toLocaleLowerCase()

  if (!normalizedUsername) {
    return null
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, display_name, username')
    .eq('username', normalizedUsername)
    .eq('is_public', true)
    .single()
    .returns<PublicProfileRow>()

  if (profileError) {
    if (profileError.code === 'PGRST116') {
      return null
    }

    throw new Error(`Could not load public profile: ${profileError.message}`)
  }

  const { data: entries, error: entriesError } = await supabase
    .from('film_entries')
    .select(publicFilmEntryColumns)
    .eq('user_id', profile.id)
    .eq('is_public', true)
    .order('date_watched', { ascending: false })
    .returns<PublicFilmEntryRow[]>()

  if (entriesError) {
    throw new Error(`Could not load public film entries: ${entriesError.message}`)
  }

  return {
    displayName: profile.display_name ?? profile.username,
    username: profile.username,
    entries: entries.map(mapPublicRowToFilmEntry),
  }
}

export const fetchPublicFilmEntries = async (): Promise<FilmEntry[]> => {
  const { data, error } = await supabase
    .from('film_entries')
    .select(publicFilmEntryColumns)
    .eq('is_public', true)
    .order('date_watched', { ascending: false })
    .returns<PublicFilmEntryRow[]>()

  if (error) {
    throw new Error(`Could not load public film entries: ${error.message}`)
  }

  return data.map(mapPublicRowToFilmEntry)
}
