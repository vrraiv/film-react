import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useFilms } from '../hooks/useFilms'
import { buildTagUsageSummary } from '../features/tagDiagnostics/tagDiagnostics'
import { buildMetadataCompleteness, backfillTmdbKeywords, type KeywordBackfillResult } from '../services/tmdbKeywordEnrichmentService'
import { useAuth } from '../auth/useAuth'
import { createFilmLogService } from '../services/filmLogService'

const ratioToPercent = (value: number | null) => (value === null ? '—' : `${(value * 100).toFixed(0)}%`)

export function SettingsPage() {
  const { films, isLoading, error, reloadFilms } = useFilms()
  const { user } = useAuth()
  const [isBackfilling, setIsBackfilling] = useState(false)
  const [forceBackfill, setForceBackfill] = useState(false)
  const [backfillResult, setBackfillResult] = useState<KeywordBackfillResult | null>(null)
  const [progressLog, setProgressLog] = useState<string[]>([])

  const summary = useMemo(() => buildTagUsageSummary(films), [films])
  const metadata = useMemo(() => buildMetadataCompleteness(films), [films])

  const runBackfill = async () => {
    if (!user) return

    setIsBackfilling(true)
    setBackfillResult(null)
    setProgressLog([])

    const service = createFilmLogService(user.id)
    const result = await backfillTmdbKeywords(service, films, {
      force: forceBackfill,
      onProgress: (message) => {
        setProgressLog((current) => [...current.slice(-199), message])
      },
    })
    setBackfillResult(result)
    await reloadFilms()
    setIsBackfilling(false)
  }

  return (
    <section className="page">
      <header className="page__hero">
        <span className="eyebrow">Settings</span>
        <h2 className="page__title">Manage your diary tools and review options.</h2>
        <p className="page__copy">
          Use this area to keep your diary information complete and organized.
        </p>
      </header>

      <section className="shell-card" aria-label="Tag diagnostics admin panel">
        <h3>Extra movie details</h3>
        <p className="page__copy">Add extra movie details to your diary entries without changing your own tags.</p>
        <ul className="insight-list">
          <li>Films logged: {metadata.totalLoggedFilms}</li>
          <li>With TMDb ID: {metadata.withTmdbId}</li>
          <li>With keywords: {metadata.withKeywords}</li>
          <li>With genres: {metadata.withGenres}</li>
          <li>With director: {metadata.withDirector}</li>
          <li>With runtime: {metadata.withRuntime}</li>
        </ul>
        <label>
          <input
            type="checkbox"
            checked={forceBackfill}
            onChange={(event) => setForceBackfill(event.target.checked)}
            disabled={isBackfilling}
          />{' '}
          Refresh entries that already have extra details
        </label>
        <p>
          <button type="button" onClick={() => void runBackfill()} disabled={isBackfilling || !user}>
            {isBackfilling ? 'Adding extra details…' : 'Add extra details now'}
          </button>
        </p>
        {backfillResult ? (
          <p className="page__copy">
            Updated {backfillResult.updated}, failed {backfillResult.failed}, skipped missing TMDb ID {backfillResult.skippedMissingTmdbId}, skipped already enriched {backfillResult.skippedAlreadyEnriched}.
          </p>
        ) : null}
        {progressLog.length > 0 ? (
          <pre style={{ maxHeight: 220, overflow: 'auto', fontSize: '0.8rem' }}>
            {progressLog.join('\n')}
          </pre>
        ) : null}

      </section>

      <section className="shell-card" aria-label="Tag review panel">
        <h3>Tag review</h3>
        <p><Link to="/settings/taste-diagnostics">Open taste review →</Link></p>
        <p><Link to="/settings/tag-metadata">Open tag notes editor →</Link></p>
        <p><Link to="/settings/recommender-config">Open recommender config →</Link></p>
        <p className="page__copy">Review how your tags are being used and spot anything that needs cleanup.</p>

        {error ? <p className="empty-state">{error}</p> : null}
        {isLoading ? <p className="page__copy">Loading…</p> : null}

        {!isLoading ? (
          <>
            <ul className="insight-list">
              <li>Films logged: {summary.totalLoggedFilms}</li>
              <li>Tags in use: {summary.tags.length}</li>
              <li>Very low usage tags (≤2 films): {summary.lowUsageTags.length}</li>
              <li>Very frequent tags (≥10 films): {summary.highUsageTags.length}</li>
            </ul>

            <h4>Low-usage tags</h4>
            {summary.lowUsageTags.length === 0 ? (
              <p className="page__copy">No low-usage tags with the current threshold.</p>
            ) : (
              <ul className="insight-list">
                {summary.lowUsageTags.map((tag) => (
                  <li key={`low-${tag.tagId}`}>{tag.label} ({tag.filmsCount})</li>
                ))}
              </ul>
            )}

            <h4>High-usage tags</h4>
            {summary.highUsageTags.length === 0 ? (
              <p className="page__copy">No high-usage tags with the current threshold.</p>
            ) : (
              <ul className="insight-list">
                {summary.highUsageTags.map((tag) => (
                  <li key={`high-${tag.tagId}`}>{tag.label} ({tag.filmsCount})</li>
                ))}
              </ul>
            )}

            <h4>All tag stats</h4>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Tag</th>
                    <th>Role</th>
                    <th>Override</th>
                    <th>Films</th>
                    <th>Avg rating</th>
                    <th>Share ≥4.0</th>
                    <th>Share ≥4.5</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.tags.map((tag) => (
                    <tr key={tag.tagId}>
                      <td>{tag.label}</td>
                      <td>{tag.role}</td>
                      <td>{tag.override ?? '—'}</td>
                      <td>{tag.filmsCount}</td>
                      <td>{tag.averageRating === null ? '—' : tag.averageRating.toFixed(2)}</td>
                      <td>{ratioToPercent(tag.shareRatedAtLeast4)}</td>
                      <td>{ratioToPercent(tag.shareRatedAtLeast45)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </section>
    </section>
  )
}
