import { useMemo, useState } from 'react'
import { buildTasteProfile, type FeatureClassification, type FeatureStats, type TasteFeatureType } from '../features/tasteProfile/tasteProfile'
import { useFilms } from '../hooks/useFilms'

const featureTypeLabels: Record<TasteFeatureType, string> = {
  manual_tag: 'Manual tag',
  tmdb_genre: 'TMDb genre',
  tmdb_keyword: 'TMDb keyword',
  director: 'Director',
  decade: 'Decade',
  country: 'Country',
  language: 'Language',
  runtime_bucket: 'Runtime bucket',
}

const classificationLabels: Record<FeatureClassification, string> = {
  safe_bet_zone: 'Safe-bet zone',
  high_interest_mixed_results: 'High-interest, mixed-result zone',
  underexplored_high_upside: 'Underexplored high-upside zone',
  low_priority: 'Low-priority',
  neutral_or_insufficient_data: 'Low-information / neutral',
  possible_avoid: 'Possible-avoid',
}

const formatPct = (value: number | null) => (value === null ? '—' : `${(value * 100).toFixed(0)}%`)
const formatScore = (value: number | null) => (value === null ? '—' : value.toFixed(2))

export function TasteDiagnosticsPage() {
  const { films, isLoading, error } = useFilms()
  const [featureTypeFilter, setFeatureTypeFilter] = useState<'all' | TasteFeatureType>('all')
  const [classificationFilter, setClassificationFilter] = useState<'all' | FeatureClassification>('all')
  const [minimumCount, setMinimumCount] = useState(1)

  const tasteProfile = useMemo(() => buildTasteProfile(films), [films])

  const filtered = useMemo(() => tasteProfile.features.filter((feature) => {
    if (featureTypeFilter !== 'all' && feature.feature.type !== featureTypeFilter) return false
    if (classificationFilter !== 'all' && feature.classification !== classificationFilter) return false
    if (feature.count < minimumCount) return false
    return true
  }), [classificationFilter, featureTypeFilter, minimumCount, tasteProfile.features])

  const grouped = useMemo(() => ({
    safeBet: filtered.filter((f) => f.classification === 'safe_bet_zone'),
    mixedResult: filtered.filter((f) => f.classification === 'high_interest_mixed_results'),
    underexplored: filtered.filter((f) => f.classification === 'underexplored_high_upside'),
    lowPriorityOrAvoid: filtered.filter((f) => f.classification === 'low_priority' || f.classification === 'possible_avoid'),
    lowInformation: filtered.filter((f) => f.classification === 'neutral_or_insufficient_data'),
  }), [filtered])

  return (
    <section className="page">
      <header className="page__hero">
        <span className="eyebrow">Taste diagnostics</span>
        <h2 className="page__title">Signal audit for future recommendations</h2>
        <p className="page__copy">
          This is a private diagnostics view. It does not recommend movies yet; it surfaces strengths and false signals before recommendation UI work begins.
        </p>
      </header>

      {error ? <section className="shell-card"><p className="empty-state">Could not load diagnostics data: {error}</p></section> : null}
      {isLoading ? <section className="shell-card"><p className="page__copy">Loading taste diagnostics…</p></section> : null}

      {!isLoading && !error ? (
        <>
          <section className="shell-card">
            <h3>Filters</h3>
            <div className="taste-filters">
              <label>
                Feature type
                <select value={featureTypeFilter} onChange={(event) => setFeatureTypeFilter(event.target.value as 'all' | TasteFeatureType)}>
                  <option value="all">All types</option>
                  {Object.entries(featureTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label>
                Classification
                <select value={classificationFilter} onChange={(event) => setClassificationFilter(event.target.value as 'all' | FeatureClassification)}>
                  <option value="all">All classes</option>
                  {Object.entries(classificationLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label>
                Minimum count
                <input type="number" min={1} value={minimumCount} onChange={(event) => setMinimumCount(Math.max(1, Number(event.target.value) || 1))} />
              </label>
            </div>
            <p className="page__copy">Showing {filtered.length} of {tasteProfile.features.length} learned features from {tasteProfile.totalFilms} films.</p>
          </section>

          <section className="shell-card">
            <h3>Feature map</h3>
            {filtered.length === 0 ? <p className="empty-state">No features match the selected filters.</p> : <FeatureMapTable features={filtered} />}
          </section>

          <section className="shell-grid">
            <ZoneCard title="Safe-bet zones" items={grouped.safeBet} />
            <ZoneCard title="High-interest, mixed-result zones" items={grouped.mixedResult} />
            <ZoneCard title="Underexplored high-upside zones" items={grouped.underexplored} />
            <ZoneCard title="Low-priority or possible-avoid features" items={grouped.lowPriorityOrAvoid} />
          </section>

          <section className="shell-card">
            <h3>Low-information tags</h3>
            <p className="page__copy">These features are currently neutral/insufficient and should not steer recommendations yet.</p>
            <FeaturePills items={grouped.lowInformation} />
          </section>
        </>
      ) : null}
    </section>
  )
}

function FeatureMapTable({ features }: { features: FeatureStats[] }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table>
        <thead>
          <tr>
            <th>Feature label</th><th>Feature type</th><th>Count</th><th>Affinity score</th><th>Average rating</th><th>Hit rate ≥ 4.0</th><th>Hit rate ≥ 4.5</th><th>Residual mean</th><th>Residual variance</th><th>Risk score</th><th>Confidence score</th><th>Classification</th>
          </tr>
        </thead>
        <tbody>
          {features.map((feature) => (
            <tr key={`${feature.feature.type}:${feature.feature.key}`}>
              <td>{feature.feature.key}</td>
              <td>{featureTypeLabels[feature.feature.type]}</td>
              <td>{feature.count}</td>
              <td>{formatScore(feature.affinityScore)}</td>
              <td>{formatScore(feature.averageRating)}</td>
              <td>{formatPct(feature.hitRateAtLeast4)}</td>
              <td>{formatPct(feature.hitRateAtLeast45)}</td>
              <td>{formatScore(feature.residualMean)}</td>
              <td>{formatScore(feature.residualVariance)}</td>
              <td>{formatScore(feature.riskScore)}</td>
              <td>{formatScore(feature.confidenceScore)}</td>
              <td>{classificationLabels[feature.classification]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ZoneCard({ title, items }: { title: string; items: FeatureStats[] }) {
  return <section className="shell-card"><h3>{title}</h3><FeaturePills items={items} /></section>
}

function FeaturePills({ items }: { items: FeatureStats[] }) {
  if (items.length === 0) return <p className="empty-state">No matching features in this section.</p>
  return <ul className="insight-list">{items.map((feature) => <li key={`${feature.feature.type}:${feature.feature.key}`}>{feature.feature.key} · {featureTypeLabels[feature.feature.type]} · count {feature.count} · confidence {feature.confidenceScore.toFixed(2)}</li>)}</ul>
}
