import { appConfig } from '../config/env'
import { loadLegacyLocalFilmEntries } from '../lib/storage/filmRepository'
import type { FilmEntry } from '../types/film'
import type { FilmLogService } from './filmLogService'

export type LocalFilmImportStatus = {
  entries: FilmEntry[]
  isImported: boolean
}

export type LocalFilmImportResult = {
  importedCount: number
  skippedCount: number
}

const importFlagKey = (userId: string) =>
  `${appConfig.storageKeyPrefix}.films.importedToSupabase.${userId}`

const getEntrySignature = (entry: FilmEntry) =>
  JSON.stringify({
    title: entry.title.trim().toLocaleLowerCase(),
    releaseYear: entry.releaseYear,
    dateWatched: entry.dateWatched,
    rating: entry.rating,
    tags: [...entry.tags].sort(),
    notes: entry.notes.trim(),
  })

export const getLocalFilmImportStatus = async (
  userId: string,
): Promise<LocalFilmImportStatus> => ({
  entries: await loadLegacyLocalFilmEntries(),
  isImported: window.localStorage.getItem(importFlagKey(userId)) === 'true',
})

export const markLocalFilmsImported = (userId: string) => {
  window.localStorage.setItem(importFlagKey(userId), 'true')
}

export const importLocalFilmsToService = async (
  userId: string,
  service: FilmLogService,
): Promise<LocalFilmImportResult> => {
  const localEntries = await loadLegacyLocalFilmEntries()
  const remoteEntries = await service.fetchEntries()
  const remoteIds = new Set(remoteEntries.map((entry) => entry.id))
  const remoteSignatures = new Set(remoteEntries.map(getEntrySignature))

  const entriesToImport = localEntries.filter(
    (entry) =>
      !remoteIds.has(entry.id) &&
      !remoteSignatures.has(getEntrySignature(entry)),
  )

  const importedEntries = await Promise.all(
    entriesToImport.map((entry) => service.createEntry(entry)),
  )

  markLocalFilmsImported(userId)

  return {
    importedCount: importedEntries.length,
    skippedCount: localEntries.length - importedEntries.length,
  }
}
