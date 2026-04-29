import { useRef, useState } from 'react'
import {
  localFilmRepository,
  parseFilmEntriesFromJson,
} from '../lib/storage/filmRepository'

const downloadJson = (filename: string, json: string) => {
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export function SettingsPage() {
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isWorking, setIsWorking] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleExport = async () => {
    setIsWorking(true)
    setError(null)

    try {
      const films = await localFilmRepository.loadFilms()
      const payload = JSON.stringify(films, null, 2)
      const timestamp = new Date().toISOString().slice(0, 10)
      downloadJson(`film-diary-${timestamp}.json`, payload)
      setStatus(`Exported ${films.length} film entries.`)
    } catch {
      setError('Could not export your diary.')
    } finally {
      setIsWorking(false)
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    setIsWorking(true)
    setStatus(null)
    setError(null)

    try {
      const text = await file.text()
      const films = parseFilmEntriesFromJson(text)
      await localFilmRepository.saveFilms(films)
      setStatus(`Imported ${films.length} film entries from ${file.name}.`)
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : 'Invalid JSON file.'
      setError(`Import failed: ${message}`)
    } finally {
      setIsWorking(false)
    }
  }

  const handleReset = async () => {
    const confirmed = window.confirm(
      'Reset your local diary? This permanently removes all saved film entries from this browser.',
    )

    if (!confirmed) {
      return
    }

    setIsWorking(true)
    setError(null)

    try {
      await localFilmRepository.saveFilms([])
      setStatus('Local diary reset complete. You now have 0 entries.')
    } catch {
      setError('Could not reset your local diary.')
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <section className="page">
      <header className="page__hero">
        <span className="eyebrow">Settings</span>
        <h2 className="page__title">Manage your local diary data.</h2>
        <p className="page__copy">
          Keep a portable backup, restore from JSON when needed, or clear everything on this device.
        </p>
      </header>

      <section className="panel settings-panel">
        <div className="button-row settings-actions">
          <button type="button" className="button-primary" onClick={handleExport} disabled={isWorking}>
            Export diary JSON
          </button>

          <button type="button" className="button-secondary" onClick={handleImportClick} disabled={isWorking}>
            Import diary JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="settings-file-input"
            onChange={handleImportFile}
          />

          <button type="button" className="button-secondary button-secondary--danger" onClick={handleReset} disabled={isWorking}>
            Reset local diary
          </button>
        </div>

        {status ? <p className="status-message">{status}</p> : null}
        {error ? <p className="empty-state">{error}</p> : null}
      </section>
    </section>
  )
}
