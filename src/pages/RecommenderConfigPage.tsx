import { useMemo, useState } from 'react'
import {
  DEFAULT_RECOMMENDER_CONFIG,
  FEATURE_OVERRIDE_LABELS,
  featureOverrideOptions,
  makeFeatureOverrideKey,
  type RecommenderFeatureOverride,
} from '../features/recommendations/recommenderConfig'
import {
  clearStoredRecommenderConfig,
  loadStoredRecommenderConfig,
  saveStoredRecommenderConfig,
} from '../features/recommendations/recommenderConfigStorage'
import { buildTasteProfile, type FeatureStats } from '../features/tasteProfile/tasteProfile'
import { useFilms } from '../hooks/useFilms'

const formatScore = (value: number | null) => (value === null ? '-' : value.toFixed(2))

const featureTypeLabels: Record<string, string> = {
  manual_tag: 'Manual tag',
  tmdb_genre: 'TMDb genre',
  tmdb_keyword: 'TMDb keyword',
  director: 'Director',
  decade: 'Decade',
  country: 'Country',
  language: 'Language',
  runtime_bucket: 'Runtime bucket',
}

export function RecommenderConfigPage() {
  const { films, isLoading, error } = useFilms()
  const [config, setConfig] = useState(() => loadStoredRecommenderConfig())
  const tasteProfile = useMemo(() => buildTasteProfile(films, config), [config, films])

  const editableFeatures = useMemo(() =>
    tasteProfile.features
      .filter((feature) => feature.count >= 1)
      .sort((left, right) =>
        Number(Boolean(right.override)) - Number(Boolean(left.override)) ||
        right.count - left.count ||
        right.affinityScore - left.affinityScore,
      )
      .slice(0, 140),
  [tasteProfile.features])

  const updateOverride = (feature: FeatureStats, override: RecommenderFeatureOverride | '') => {
    const key = makeFeatureOverrideKey(feature.feature)
    const nextOverrides = { ...config.featureOverrides }
    if (override) {
      nextOverrides[key] = override
    } else {
      delete nextOverrides[key]
    }

    const nextConfig = { ...config, featureOverrides: nextOverrides }
    setConfig(nextConfig)
    saveStoredRecommenderConfig(nextConfig)
  }

  const resetOverrides = () => {
    clearStoredRecommenderConfig()
    setConfig(DEFAULT_RECOMMENDER_CONFIG)
  }

  return (
    <section className="page">
      <header className="page__hero">
        <span className="eyebrow">Recommender config</span>
        <h2 className="page__title">Tune false signals without changing scorer code</h2>
        <p className="page__copy">
          Private V1 config view. Numeric defaults live in the config file; feature overrides are stored locally in this browser.
        </p>
      </header>

      {error ? <section className="shell-card"><p className="empty-state">{error}</p></section> : null}
      {isLoading ? <section className="shell-card"><p className="page__copy">Loading recommender config...</p></section> : null}

      {!isLoading ? (
        <>
          <section className="shell-card">
            <h3>Effective config</h3>
            <div className="config-grid">
              <ConfigValue label="Minimum feature count" value={config.minimumFeatureCount} />
              <ConfigValue label="Positive threshold" value={config.ratingPositiveThreshold} />
              <ConfigValue label="Strong positive threshold" value={config.ratingStrongPositiveThreshold} />
              <ConfigValue label="Selection-feature negative cap" value={config.maxNegativePenaltyForSelectionFeatures} />
              <ConfigValue label="TMDb popularity prior weight" value={config.tmdbPopularityPriorWeight} />
              <ConfigValue label="Active overrides" value={Object.keys(config.featureOverrides).length} />
            </div>
          </section>

          <section className="shell-card">
            <div className="import-preview-actions">
              <div>
                <h3>Feature overrides</h3>
                <p className="page__copy">Overrides apply to taste diagnostics and newly generated recommendations.</p>
              </div>
              <button className="button-secondary" type="button" onClick={resetOverrides}>
                Reset local overrides
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th>Type</th>
                    <th>Count</th>
                    <th>Affinity</th>
                    <th>Expected</th>
                    <th>Risk</th>
                    <th>Override</th>
                    <th>Impact</th>
                  </tr>
                </thead>
                <tbody>
                  {editableFeatures.map((feature) => {
                    const key = makeFeatureOverrideKey(feature.feature)
                    const selectedOverride = config.featureOverrides[key] ?? ''

                    return (
                      <tr key={key}>
                        <td>{feature.feature.key}</td>
                        <td>{featureTypeLabels[feature.feature.type]}</td>
                        <td>{feature.count}</td>
                        <td>{formatScore(feature.affinityScore)}</td>
                        <td>{formatScore(feature.expectedSatisfactionScore)}</td>
                        <td>{formatScore(feature.riskScore)}</td>
                        <td>
                          <select
                            value={selectedOverride}
                            onChange={(event) => updateOverride(feature, event.target.value as RecommenderFeatureOverride | '')}
                          >
                            <option value="">Default</option>
                            {featureOverrideOptions.map((override) => (
                              <option key={override} value={override}>{FEATURE_OVERRIDE_LABELS[override]}</option>
                            ))}
                          </select>
                        </td>
                        <td>{feature.overrideImpact ?? '-'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </section>
  )
}

function ConfigValue({ label, value }: { label: string; value: number }) {
  return (
    <div className="import-summary">
      <span className="meta">{label}</span>
      <strong>{value.toFixed(Number.isInteger(value) ? 0 : 2)}</strong>
    </div>
  )
}
