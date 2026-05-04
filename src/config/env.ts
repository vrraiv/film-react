const readEnv = (value: string | undefined, fallback: string) => {
  const trimmed = value?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : fallback
}

const readCsvEnv = (value: string | undefined) =>
  value
    ?.split(',')
    .map((item) => item.trim().toLocaleLowerCase())
    .filter(Boolean) ?? []

const readBooleanEnv = (value: string | undefined, fallback: boolean) => {
  const trimmed = value?.trim().toLocaleLowerCase()

  if (!trimmed) {
    return fallback
  }

  return trimmed === 'true'
}

const defaultOrigin =
  typeof window !== 'undefined' && window.location.origin
    ? window.location.origin
    : 'http://localhost:5173'

export const appConfig = {
  appTitle: readEnv(import.meta.env.VITE_APP_TITLE, 'Film tracker'),
  storageKeyPrefix: readEnv(import.meta.env.VITE_STORAGE_KEY_PREFIX, 'film-react'),
  publicBaseUrl: readEnv(import.meta.env.VITE_PUBLIC_BASE_URL, defaultOrigin),
  enableLetterboxdImport: readBooleanEnv(
    import.meta.env.VITE_ENABLE_LETTERBOXD_IMPORT,
    true,
  ),
  letterboxdImportAdminEmails: readCsvEnv(
    import.meta.env.VITE_LETTERBOXD_IMPORT_ADMIN_EMAILS,
  ),
} as const
