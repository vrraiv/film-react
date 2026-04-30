const readEnv = (value: string | undefined, fallback: string) => {
  const trimmed = value?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : fallback
}

const defaultOrigin =
  typeof window !== 'undefined' && window.location.origin
    ? window.location.origin
    : 'http://localhost:5173'

export const appConfig = {
  appTitle: readEnv(import.meta.env.VITE_APP_TITLE, 'Film tracker'),
  storageKeyPrefix: readEnv(import.meta.env.VITE_STORAGE_KEY_PREFIX, 'film-react'),
  publicBaseUrl: readEnv(import.meta.env.VITE_PUBLIC_BASE_URL, defaultOrigin),
} as const
