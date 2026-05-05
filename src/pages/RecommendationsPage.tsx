import { useMemo, useState } from 'react'
import {
  buildPersonalRecommendations,
  type FilmRecommendation,
  type RecommendationType,
} from '../features/recommendations/recommender'
import {
  DEFAULT_RECOMMENDER_CONFIG,
  type RecommenderConfig,
  type RecommenderFeatureWeights,
} from '../features/recommendations/recommenderConfig'
import {
  loadStoredRecommenderConfig,
  saveStoredRecommenderConfig,
} from '../features/recommendations/recommenderConfigStorage'
import { buildMlDatasetExport, serializeMlDatasetExport } from '../features/mlDataset/datasetExport'
import { useFilms } from '../hooks/useFilms'

type TypeFilter = 'all' | Exclude<RecommendationType, 'rewatch_candidate'>
type RuntimeFilter = 'all' | 'short' | 'standard' | 'long'

const typeLabels: Record<RecommendationType, string> = {
  safe_bet: 'Safe bet',
  worth_the_gamble: 'Worth the gamble',
  stretch_pick: 'Stretch',
  deep_cut: 'Deep cut',
  underexplored_fit: 'Underexplored fit',
  rewatch_candidate: 'Rewatch',
}

const runtimeLabels: Record<RuntimeFilter, string> = {
  all: 'Any runtime',
  short: 'Under 90 min',
  standard: '90-130 min',
  long: 'Over 130 min',
}

const scorePct = (value: number) => `${Math.round(value * 100)}`

const configFieldLabels: Array<{
  key: keyof Pick<
    RecommenderConfig,
    | 'minimumFeatureCount'
    | 'ratingPositiveThreshold'
    | 'ratingStrongPositiveThreshold'
    | 'maxNegativePenaltyForSelectionFeatures'
    | 'tmdbPopularityPriorWeight'
  >
  label: string
  min: number
  max: number
  step: number
}> = [
  { key: 'minimumFeatureCount', label: 'Minimum feature count', min: 1, max: 10, step: 1 },
  { key: 'ratingPositiveThreshold', label: 'Positive rating threshold', min: 0.5, max: 5, step: 0.5 },
  { key: 'ratingStrongPositiveThreshold', label: 'Strong positive threshold', min: 0.5, max: 5, step: 0.5 },
  { key: 'maxNegativePenaltyForSelectionFeatures', label: 'Selection-feature penalty cap', min: 0, max: 0.6, step: 0.01 },
  { key: 'tmdbPopularityPriorWeight', label: 'TMDb prior weight', min: 0, max: 0.4, step: 0.01 },
]

const featureWeightLabels: Array<{ key: keyof RecommenderFeatureWeights; label: string }> = [
  { key: 'manual_tag', label: 'Manual tags' },
  { key: 'tmdb_keyword', label: 'TMDb keywords' },
  { key: 'director', label: 'Director' },
  { key: 'tmdb_genre', label: 'Genre' },
  { key: 'decade', label: 'Decade' },
  { key: 'country', label: 'Country' },
  { key: 'language', label: 'Language' },
  { key: 'runtime_bucket', label: 'Runtime bucket' },
]

const runtimeMatches = (recommendation: FilmRecommendation, filter: RuntimeFilter) => {
  if (filter === 'all' || recommendation.runtime === null) return true
  if (filter === 'short') return recommendation.runtime < 90
  if (filter === 'standard') return recommendation.runtime >= 90 && recommendation.runtime <= 130
  return recommendation.runtime > 130
}

export function RecommendationsPage() {
  const { films, isLoading: filmsLoading, error: filmsError } = useFilms()
  const [recommendations, setRecommendations] = useState<FilmRecommendation[]>([])
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false)
  const [recommendationError, setRecommendationError] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [runtimeFilter, setRuntimeFilter] = useState<RuntimeFilter>('all')
  const [includeWatched, setIncludeWatched] = useState(false)
  const [seedTmdbId, setSeedTmdbId] = useState('')
  const [recommenderConfig, setRecommenderConfig] = useState(() => loadStoredRecommenderConfig())
  const [validationFraction, setValidationFraction] = useState(0.2)

  const seedOptions = useMemo(() =>
    films
      .filter((film) => film.metadata.tmdb?.id && film.rating !== null)
      .sort((left, right) =>
        (right.rating ?? 0) - (left.rating ?? 0) ||
        left.title.localeCompare(right.title),
      )
      .slice(0, 80),
  [films])

  const filteredRecommendations = useMemo(() =>
    recommendations.filter((recommendation) => {
      if (!includeWatched && recommendation.recommendationType === 'rewatch_candidate') return false
      if (typeFilter !== 'all' && recommendation.recommendationType !== typeFilter) return false
      if (!runtimeMatches(recommendation, runtimeFilter)) return false
      return true
    }),
  [includeWatched, recommendations, runtimeFilter, typeFilter])

  const generateRecommendations = async () => {
    setIsLoadingRecommendations(true)
    setRecommendationError(null)

    try {
      const nextRecommendations = await buildPersonalRecommendations(films, {
        includeWatched,
        seedTmdbId: seedTmdbId ? Number(seedTmdbId) : null,
        config: recommenderConfig,
      })
      setRecommendations(nextRecommendations)
    } catch (error) {
      console.error(error)
      setRecommendationError(error instanceof Error ? error.message : 'Could not build recommendations.')
    } finally {
      setIsLoadingRecommendations(false)
    }
  }

  const updateRecommenderConfig = (nextConfig: RecommenderConfig) => {
    setRecommenderConfig(nextConfig)
    saveStoredRecommenderConfig(nextConfig)
    setRecommendations([])
  }

  const exportMlDataset = () => {
    const dataset = buildMlDatasetExport(films, {
      candidates: recommendations,
      config: recommenderConfig,
      validationFraction,
    })
    const blob = new Blob([serializeMlDatasetExport(dataset)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'film-diary-ml-dataset-v1.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="page">
      <header className="page__hero">
        <span className="eyebrow">Personal recommendations</span>
        <h2 className="page__title">Deterministic picks from your diary</h2>
        <p className="page__copy">
          Private V1 recommender using diary ratings, manual tags, TMDb metadata, and explainable feature matches.
        </p>
      </header>

      <section className="panel recommendations-controls">
        <div className="panel__header">
          <h3 className="panel__title">Build recommendations</h3>
          <p className="page__copy">
            Seeds come from films rated {recommenderConfig.ratingPositiveThreshold.toFixed(1)}+ unless a specific seed is selected.
          </p>
        </div>

        <div className="taste-filters">
          <label>
            Recommendation type
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}>
              <option value="all">All recommendation types</option>
              <option value="safe_bet">Safe bet</option>
              <option value="worth_the_gamble">Worth the gamble</option>
              <option value="stretch_pick">Stretch</option>
              <option value="deep_cut">Deep cut</option>
              <option value="underexplored_fit">Underexplored fit</option>
            </select>
          </label>

          <label>
            Runtime
            <select value={runtimeFilter} onChange={(event) => setRuntimeFilter(event.target.value as RuntimeFilter)}>
              {Object.entries(runtimeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          <label>
            Something like this
            <select value={seedTmdbId} onChange={(event) => setSeedTmdbId(event.target.value)}>
              <option value="">Use high-rated diary seeds</option>
              {seedOptions.map((film) => (
                <option key={film.id} value={film.metadata.tmdb?.id}>
                  {film.title}{film.releaseYear ? ` (${film.releaseYear})` : ''} - {film.rating?.toFixed(1)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="check-pill">
          <input
            type="checkbox"
            checked={includeWatched}
            onChange={(event) => setIncludeWatched(event.target.checked)}
          />
          Include watched / rewatch candidates
        </label>

        <div className="button-row">
          <button
            className="button-primary"
            type="button"
            onClick={() => void generateRecommendations()}
            disabled={filmsLoading || isLoadingRecommendations || films.length === 0}
          >
            {isLoadingRecommendations ? 'Scoring recommendations...' : 'Generate recommendations'}
          </button>
        </div>
      </section>

      <RecommenderConfigPanel
        config={recommenderConfig}
        onChange={updateRecommenderConfig}
      />

      <section className="panel recommendations-controls">
        <div className="panel__header">
          <h3 className="panel__title">ML dataset export</h3>
          <p className="page__copy">
            Exports logged films plus the current generated recommendation candidates. Candidate rows are marked as unknown sampled rows, not dislikes.
          </p>
        </div>

        <div className="taste-filters">
          <label>
            Validation fraction
            <input
              type="number"
              min={0.05}
              max={0.5}
              step={0.05}
              value={validationFraction}
              onChange={(event) => setValidationFraction(Math.max(0.05, Math.min(0.5, Number(event.target.value) || 0.2)))}
            />
          </label>
        </div>

        <div className="button-row">
          <button
            className="button-secondary"
            type="button"
            onClick={exportMlDataset}
            disabled={filmsLoading || films.length === 0}
          >
            Export ML dataset JSON
          </button>
        </div>
      </section>

      {filmsError ? <section className="shell-card"><p className="empty-state">Could not load diary data: {filmsError}</p></section> : null}
      {recommendationError ? <section className="shell-card"><p className="empty-state">Could not generate recommendations: {recommendationError}</p></section> : null}
      {filmsLoading ? <section className="shell-card"><p className="page__copy">Loading diary data...</p></section> : null}

      {!filmsLoading && recommendations.length === 0 && !recommendationError ? (
        <section className="shell-card">
          <p className="empty-state">Generate recommendations to fetch TMDb candidates and score them against your taste profile.</p>
        </section>
      ) : null}

      {filteredRecommendations.length > 0 ? (
        <section className="recommendation-list">
          {filteredRecommendations.map((recommendation) => (
            <RecommendationCard key={`${recommendation.tmdbId}-${recommendation.recommendationType}`} recommendation={recommendation} />
          ))}
        </section>
      ) : recommendations.length > 0 ? (
        <section className="shell-card">
          <p className="empty-state">No recommendations match the selected filters.</p>
        </section>
      ) : null}
    </section>
  )
}

function RecommenderConfigPanel({
  config,
  onChange,
}: {
  config: RecommenderConfig
  onChange: (config: RecommenderConfig) => void
}) {
  const updateNumberField = (
    key: (typeof configFieldLabels)[number]['key'],
    value: number,
  ) => {
    onChange({ ...config, [key]: value })
  }

  const updateFeatureWeight = (key: keyof RecommenderFeatureWeights, value: number) => {
    onChange({
      ...config,
      featureWeights: {
        ...config.featureWeights,
        [key]: value,
      },
    })
  }

  const resetNumericDefaults = () => {
    onChange({
      ...DEFAULT_RECOMMENDER_CONFIG,
      featureOverrides: config.featureOverrides,
    })
  }

  return (
    <section className="panel recommendations-controls">
      <div className="import-preview-actions">
        <div className="panel__header">
          <h3 className="panel__title">Scoring config</h3>
          <p className="page__copy">Adjusts the effective recommender config stored in this browser.</p>
        </div>
        <button className="button-secondary" type="button" onClick={resetNumericDefaults}>
          Reset config values
        </button>
      </div>

      <div className="taste-filters">
        {configFieldLabels.map((field) => (
          <label key={field.key}>
            {field.label}
            <input
              type="number"
              min={field.min}
              max={field.max}
              step={field.step}
              value={config[field.key]}
              onChange={(event) => updateNumberField(field.key, Number(event.target.value))}
            />
          </label>
        ))}
      </div>

      <div>
        <h4 className="recommendation-card__subhead">Feature weights</h4>
        <div className="taste-filters">
          {featureWeightLabels.map((field) => (
            <label key={field.key}>
              {field.label}
              <input
                type="number"
                min={0}
                max={2}
                step={0.01}
                value={config.featureWeights[field.key]}
                onChange={(event) => updateFeatureWeight(field.key, Number(event.target.value))}
              />
            </label>
          ))}
        </div>
      </div>
    </section>
  )
}

function RecommendationCard({ recommendation }: { recommendation: FilmRecommendation }) {
  return (
    <article className="film-card recommendation-card">
      <div className="film-card__content">
        <div className="film-card__poster-wrap">
          {recommendation.posterUrl ? (
            <img className="film-card__poster" src={recommendation.posterUrl} alt={`Poster for ${recommendation.title}`} loading="lazy" />
          ) : (
            <div className="film-card__poster film-card__poster--placeholder" aria-hidden="true">No poster</div>
          )}
        </div>

        <div className="film-card__details">
          <header className="film-card__header">
            <div>
              <h3 className="film-card__title">{recommendation.title}</h3>
              <p className="meta">
                {[
                  recommendation.year,
                  recommendation.director,
                  recommendation.runtime === null ? null : `${recommendation.runtime} min`,
                ].filter(Boolean).join(' - ')}
              </p>
            </div>
            <span className="film-card__rating">{typeLabels[recommendation.recommendationType]}</span>
          </header>

          <div className="recommendation-score-grid">
            <ScorePill label="Interest" value={recommendation.interestScore} />
            <ScorePill label="Expected" value={recommendation.expectedSatisfactionScore} />
            <ScorePill label="Risk" value={recommendation.riskScore} />
            <ScorePill label="Confidence" value={recommendation.confidenceScore} />
          </div>

          {recommendation.genres.length > 0 ? (
            <div className="tag-row">
              {recommendation.genres.slice(0, 5).map((genre) => <span className="tag-chip tag-chip--static" key={genre}>{genre}</span>)}
            </div>
          ) : null}

          <ExplanationBlock title="Why it fits" items={recommendation.primaryReasons} emptyText="No strong grounded reasons yet." />
          <ExplanationBlock title="Manual override effects" items={recommendation.overrideReasons} emptyText="No manual overrides materially affected this score." />
          <ExplanationBlock title="Cautions" items={recommendation.cautions} emptyText="No major grounded cautions." />

          {recommendation.similarLikedFilms.length > 0 ? (
            <div>
              <h4 className="recommendation-card__subhead">Similar liked diary films</h4>
              <p className="page__copy">
                {recommendation.similarLikedFilms.map((film) => `${film.title}${film.rating ? ` (${film.rating.toFixed(1)})` : ''}`).join(', ')}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  )
}

function ScorePill({ label, value }: { label: string; value: number }) {
  return <span className="meta-pill"><strong>{label}</strong> {scorePct(value)}</span>
}

function ExplanationBlock({ title, items, emptyText }: { title: string; items: string[]; emptyText: string }) {
  return (
    <div>
      <h4 className="recommendation-card__subhead">{title}</h4>
      {items.length > 0 ? (
        <ul className="recommendation-reasons">
          {items.map((item) => <li key={item}>{item}</li>)}
        </ul>
      ) : <p className="page__copy">{emptyText}</p>}
    </div>
  )
}
