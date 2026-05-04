import { Link } from 'react-router-dom'
import { useMemo } from 'react'
import { useFilms } from '../hooks/useFilms'
import { buildTagUsageSummary } from '../features/tagDiagnostics/tagDiagnostics'

const ratioToPercent = (value: number | null) => (value === null ? '—' : `${(value * 100).toFixed(0)}%`)

export function SettingsPage() {
  const { films, isLoading, error } = useFilms()

  const summary = useMemo(() => buildTagUsageSummary(films), [films])

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
