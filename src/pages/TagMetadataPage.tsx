import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { FILM_TAGS, getTagById } from '../config/filmTags'
import {
  type FeatureOverride,
  type FeatureRole,
  getTagMetadata,
  type TagMetadata,
} from '../config/tagModeling'
import { buildTagUsageSummary } from '../features/tagDiagnostics/tagDiagnostics'
import { useFilms } from '../hooks/useFilms'
import { fetchTagMetadata, upsertTagMetadata } from '../services/tagMetadataService'

const roles: FeatureRole[] = [
  'selection_affinity',
  'satisfaction_predictor',
  'negative_experience_signal',
  'neutral_descriptor',
  'manual_override',
]

const overrides: Array<FeatureOverride | ''> = ['', 'seek', 'like_when_done_well', 'neutral', 'avoid', 'ignore']

export function TagMetadataPage() {
  const { user } = useAuth()
  const { films, isLoading } = useFilms()
  const [metadata, setMetadata] = useState<Record<string, TagMetadata>>({})
  const [isSavingTag, setIsSavingTag] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const summary = useMemo(() => buildTagUsageSummary(films), [films])

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const stored = await fetchTagMetadata()
        if (mounted) {
          setMetadata(stored)
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : 'Could not load tag metadata.')
        }
      }
    }
    void load()
    return () => {
      mounted = false
    }
  }, [])

  const knownTagIds = new Set(FILM_TAGS.map((tag) => tag.id))

  const rows = summary.tags.map((stat) => {
    const configured = metadata[stat.tagId] ?? getTagMetadata(stat.tagId)
    return {
      ...stat,
      role: configured.role,
      override: configured.override,
      notes: configured.notes ?? '',
      isUnknown: !knownTagIds.has(stat.tagId),
    }
  })

  const saveTag = async (nextMetadata: TagMetadata) => {
    if (!user) {
      return
    }

    setIsSavingTag(nextMetadata.tagId)
    setError(null)

    try {
      await upsertTagMetadata(user.id, nextMetadata)
      setMetadata((prev) => ({ ...prev, [nextMetadata.tagId]: nextMetadata }))
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save tag metadata.')
    } finally {
      setIsSavingTag(null)
    }
  }

  return (
    <section className="page">
      <header className="page__hero">
        <span className="eyebrow">Admin</span>
        <h2 className="page__title">Tag metadata</h2>
        <p className="page__copy">Edit modelling role/override while auditing tag quality. Unknown tags are flagged for review.</p>
        <p><Link to="/settings">← Back to settings</Link></p>
      </header>
      {error ? <p className="empty-state">{error}</p> : null}
      {isLoading ? <p className="page__copy">Loading…</p> : null}
      {!isLoading ? (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Tag</th><th>Usage</th><th>Role</th><th>Override</th><th>Notes</th><th>Flags</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.tagId}>
                  <td>{getTagById(row.tagId)?.label ?? row.tagId}</td>
                  <td>{row.filmsCount}</td>
                  <td>
                    <select
                      value={row.role}
                      onChange={(event) => void saveTag({ ...row, role: event.target.value as FeatureRole })}
                      disabled={isSavingTag === row.tagId}
                    >
                      {roles.map((role) => <option key={role} value={role}>{role}</option>)}
                    </select>
                  </td>
                  <td>
                    <select
                      value={row.override ?? ''}
                      onChange={(event) => void saveTag({ ...row, override: (event.target.value || undefined) as FeatureOverride | undefined })}
                      disabled={isSavingTag === row.tagId}
                    >
                      {overrides.map((override) => <option key={override || 'none'} value={override}>{override || 'none'}</option>)}
                    </select>
                  </td>
                  <td>
                    <input
                      value={row.notes}
                      onBlur={(event) => void saveTag({ ...row, notes: event.target.value })}
                      onChange={(event) => setMetadata((prev) => ({ ...prev, [row.tagId]: { ...row, notes: event.target.value } }))}
                    />
                  </td>
                  <td>{row.isUnknown ? 'unknown_tag' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  )
}
