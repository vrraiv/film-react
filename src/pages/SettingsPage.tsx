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
        <h2 className="page__title">Supabase is the source of truth.</h2>
        <p className="page__copy">
          Film diary entries are stored in Supabase for authenticated users.
        </p>
      </header>

      <section className="shell-card" aria-label="Tag diagnostics admin panel">
        <h3>TMDb metadata enrichment (admin)</h3>
        <p className="page__copy">Adds TMDb keywords as metadata only. Manual tags are untouched.</p>
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
          Force refresh movies that already have TMDb keywords
        </label>
        <p>
          <button type="button" onClick={() => void runBackfill()} disabled={isBackfilling || !user}>
            {isBackfilling ? 'Backfilling TMDb keywords…' : 'Run TMDb keyword backfill'}
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

      <section className="shell-card" aria-label="Tag diagnostics admin panel">
        <h3>Tag diagnostics (admin)</h3>
        <p><Link to="/settings/tag-metadata">Open tag metadata editor →</Link></p>
        <p className="page__copy">Hidden from public routes. Use this to audit tag quality before recommendation work.</p>

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
