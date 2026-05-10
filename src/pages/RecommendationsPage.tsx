import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/useAuth'
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
import { fetchPublicFilmEntries } from '../services/publicFilmProfileService'
import type { FilmEntry } from '../types/film'

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

const readonlyTagLimit = 5
const publicRecommendationLimit = 8
const scorePct = (value: number) => `${Math.round(value * 100)}`

const getFilmTmdbId = (film: FilmEntry) => film.metadata.tmdb?.id ?? film.tmdbMetadata?.id ?? null

const hydratePublicFilmForRecommender = (film: FilmEntry): FilmEntry => {
  const tmdb = film.metadata.tmdb ?? film.tmdbMetadata ?? null

  if (!tmdb) return film

  return {
    ...film,
    metadata: {
      ...film.metadata,
      tmdb,
      keywords: film.metadata.keywords ?? tmdb.keywords?.map((value) => ({ source: 'tmdb' as const, value })),
    },
  }
}

const configFieldLabels: Array<{
  key: keyof Pick<
    RecommenderConfig,
    | 'minimumFeatureCount'
    | 'ratingPositiveThreshold'
    | 'ratingStrongPositiveThreshold'
    | 'maxNegativePenaltyForSelectionFeatures'
    | 'tmdbPopularityPriorWeight'
    | 'minVoteCount'
    | 'minRuntimeMinutes'
    | 'voteShrinkagePrior'
    | 'voteShrinkageMean'
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
  { key: 'tmdbPopularityPriorWeight', label: 'TMDb prior weight', min: 0, max: 0.6, step: 0.01 },
  { key: 'minVoteCount', label: 'Min TMDb vote count', min: 0, max: 500, step: 5 },
  { key: 'minRuntimeMinutes', label: 'Min runtime (minutes)', min: 0, max: 180, step: 5 },
  { key: 'voteShrinkagePrior', label: 'Bayesian shrinkage prior (m)', min: 0, max: 500, step: 5 },
  { key: 'voteShrinkageMean', label: 'Bayesian global mean (C)', min: 0, max: 10, step: 0.1 },
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
  const { user, loading: authLoading } = useAuth()
  const isOwner = Boolean(user)
  const { films: privateFilms, isLoading: privateFilmsLoading, error: privateFilmsError } = useFilms(
    undefined,
    { enabled: isOwner },
  )
  const [publicFilms, setPublicFilms] = useState<FilmEntry[]>([])
  const [isLoadingPublicFilms, setIsLoadingPublicFilms] = useState(false)
  const [publicError, setPublicError] = useState<string | null>(null)
  const [recommendations, setRecommendations] = useState<FilmRecommendation[]>([])
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false)
  const [recommendationError, setRecommendationError] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [runtimeFilter, setRuntimeFilter] = useState<RuntimeFilter>('all')
  const [includeWatched, setIncludeWatched] = useState(false)
  const [seedTmdbId, setSeedTmdbId] = useState('')
  const [recommenderConfig, setRecommenderConfig] = useState<RecommenderConfig>(DEFAULT_RECOMMENDER_CONFIG)
  const [validationFraction, setValidationFraction] = useState(0.2)

  const activeFilms = useMemo(
    () => isOwner ? privateFilms : publicFilms.map(hydratePublicFilmForRecommender),
    [isOwner, privateFilms, publicFilms],
  )
  const filmsLoading = isOwner ? privateFilmsLoading : authLoading || isLoadingPublicFilms
  const filmsError = isOwner ? privateFilmsError : publicError
  const activeConfig = isOwner ? recommenderConfig : DEFAULT_RECOMMENDER_CONFIG
  const filmDataLabel = isOwner ? 'diary data' : 'public diary data'

  useEffect(() => {
    if (isOwner) {
      setRecommenderConfig(loadStoredRecommenderConfig())
    } else {
      setRecommenderConfig(DEFAULT_RECOMMENDER_CONFIG)
    }
  }, [isOwner])

  useEffect(() => {
    setRecommendations([])
    setRecommendationError(null)
    setSeedTmdbId('')
    setTypeFilter('all')
    setRuntimeFilter('all')
    setIncludeWatched(false)
  }, [isOwner])

  useEffect(() => {
    if (authLoading || isOwner) {
      return
    }

    let isMounted = true

    const loadPublicFilms = async () => {
      setIsLoadingPublicFilms(true)
      setPublicError(null)

      try {
        const nextFilms = await fetchPublicFilmEntries()

        if (isMounted) {
          setPublicFilms(nextFilms)
        }
      } catch {
        if (isMounted) {
          setPublicError('We could not load public diary data right now.')
        }
      } finally {
        if (isMounted) {
          setIsLoadingPublicFilms(false)
        }
      }
    }

    void loadPublicFilms()

    return () => {
      isMounted = false
    }
  }, [authLoading, isOwner])

  const seedOptions = useMemo(() =>
    activeFilms
      .filter((film) => getFilmTmdbId(film) !== null && film.rating !== null)
      .sort((left, right) =>
        (right.rating ?? 0) - (left.rating ?? 0) ||
        left.title.localeCompare(right.title),
      )
      .slice(0, 80),
  [activeFilms])

  const hasUsableSeeds = seedOptions.length > 0

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
      const nextRecommendations = await buildPersonalRecommendations(activeFilms, {
        includeWatched: isOwner ? includeWatched : false,
        seedTmdbId: seedTmdbId ? Number(seedTmdbId) : null,
        maxSeeds: isOwner ? undefined : 1,
        maxEnrichedCandidates: isOwner ? undefined : publicRecommendationLimit,
        config: activeConfig,
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
    const dataset = buildMlDatasetExport(privateFilms, {
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
        <h2 className="page__title">
          {isOwner ? 'Deterministic picks from your diary' : 'Find something to watch from a film you already like'}
        </h2>
        {isOwner ? (
          <p className="page__copy">
            Private V1 recommender using diary ratings, manual tags, TMDb metadata, and explainable feature matches.
          </p>
        ) : (
          <>
            <p className="page__copy">
              Pick a movie I&apos;ve rated that you like, and get recommendations on what to watch if you liked it.
              The results start with movies that TMDB connects to that pick, then they are re-ranked through the
              patterns in my public diary.
            </p>
            <p className="page__copy">
              The ranking favors films that overlap with things I have repeatedly responded to: high ratings,
              recurring tags, genres, keywords, directors, countries, languages, decades, and runtime ranges. A movie
              can move up when it shares traits with films I loved, and it can move down when those same traits have
              been more mixed for me. Each card includes a short reason so the list reads less like a mystery score and
              more like a trail of taste clues.
            </p>
          </>
        )}
      </header>

      <section className="panel recommendations-controls">
        <div className="panel__header">
          <h3 className="panel__title">Build recommendations</h3>
          <p className="page__copy">
            {isOwner
              ? `Seeds come from films rated ${activeConfig.ratingPositiveThreshold.toFixed(1)}+ unless a specific seed is selected.`
              : `Choose one of my public ${activeConfig.ratingPositiveThreshold.toFixed(1)}+ ratings, or leave the picker on the default to let the page use a strong favorite as the starting point.`}
          </p>
        </div>

        <div className="taste-filters">
          {isOwner ? (
            <>
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
            </>
          ) : null}

          <label>
            Something like this
            <select value={seedTmdbId} onChange={(event) => setSeedTmdbId(event.target.value)}>
              <option value="">{isOwner ? 'Use high-rated diary seeds' : 'Use a top public favorite'}</option>
              {seedOptions.map((film) => (
                <option key={film.id} value={getFilmTmdbId(film) ?? ''}>
                  {film.title}{film.releaseYear ? ` (${film.releaseYear})` : ''} - {film.rating?.toFixed(1)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {isOwner ? (
          <label className="check-pill">
            <input
              type="checkbox"
              checked={includeWatched}
              onChange={(event) => setIncludeWatched(event.target.checked)}
            />
            Include watched / rewatch candidates
          </label>
        ) : null}

        <div className="button-row">
          <button
            className="button-primary"
            type="button"
            onClick={() => void generateRecommendations()}
            disabled={filmsLoading || isLoadingRecommendations || !hasUsableSeeds}
          >
            {isLoadingRecommendations ? 'Scoring recommendations...' : 'Generate recommendations'}
          </button>
        </div>
      </section>

      {isOwner ? (
        <RecommenderConfigPanel
          config={recommenderConfig}
          onChange={updateRecommenderConfig}
        />
      ) : null}

      {isOwner ? (
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
              disabled={filmsLoading || privateFilms.length === 0}
            >
              Export ML dataset JSON
            </button>
          </div>
        </section>
      ) : null}

      {filmsError ? <section className="shell-card"><p className="empty-state">Could not load {filmDataLabel}: {filmsError}</p></section> : null}
      {recommendationError ? <section className="shell-card"><p className="empty-state">Could not generate recommendations: {recommendationError}</p></section> : null}
      {filmsLoading ? <section className="shell-card"><p className="page__copy">Loading {filmDataLabel}...</p></section> : null}

      {!filmsLoading && recommendations.length === 0 && !recommendationError ? (
        <section className="shell-card">
          <p className="empty-state">
            {hasUsableSeeds
              ? isOwner
                ? 'Generate recommendations to fetch TMDb candidates and score them against the taste profile.'
                : 'Generate recommendations to turn that public diary pick into a short watchlist with plain-English reasons.'
              : isOwner
                ? 'Recommendations need rated diary films with TMDb metadata.'
                : 'Recommendations need public films with ratings and TMDb metadata.'}
          </p>
        </section>
      ) : null}

      {filteredRecommendations.length > 0 ? (
        <section className="recommendation-list">
          {filteredRecommendations.map((recommendation) => (
            <RecommendationCard
              key={`${recommendation.tmdbId}-${recommendation.recommendationType}`}
              recommendation={recommendation}
              showOwnerDetails={isOwner}
            />
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

function RecommendationCard({
  recommendation,
  showOwnerDetails,
}: {
  recommendation: FilmRecommendation
  showOwnerDetails: boolean
}) {
  const [isGenreListExpanded, setIsGenreListExpanded] = useState(false)
  const visibleGenres = isGenreListExpanded ? recommendation.genres : recommendation.genres.slice(0, readonlyTagLimit)
  const hiddenGenreCount = Math.max(0, recommendation.genres.length - readonlyTagLimit)
  const genreListLabel = recommendation.genres.join(', ')
  const primaryReasons = showOwnerDetails
    ? recommendation.primaryReasons
    : recommendation.primaryReasons.slice(0, 3)

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

          {recommendation.overview ? (
            <p className="recommendation-card__overview" title={recommendation.overview}>
              {recommendation.overview}
            </p>
          ) : null}

          {showOwnerDetails && recommendation.cast.length > 0 ? (
            <div>
              <h4 className="recommendation-card__subhead">Cast</h4>
              <p className="page__copy">{recommendation.cast.join(', ')}</p>
            </div>
          ) : null}

          {recommendation.genres.length > 0 ? (
            <div
              className={`tag-row tag-row--readonly${isGenreListExpanded ? ' tag-row--readonly-expanded' : ''}`}
              aria-label={`Genres: ${genreListLabel}`}
              title={genreListLabel}
            >
              {visibleGenres.map((genre) => <span className="tag-chip tag-chip--static" key={genre}>{genre}</span>)}
              {hiddenGenreCount > 0 ? (
                <button
                  className="tag-chip tag-chip--static tag-chip--overflow tag-chip--toggle"
                  type="button"
                  aria-expanded={isGenreListExpanded}
                  aria-label={isGenreListExpanded ? 'Collapse genres' : `Show ${hiddenGenreCount} more genres`}
                  onClick={() => setIsGenreListExpanded((current) => !current)}
                >
                  {isGenreListExpanded ? 'Less' : `+${hiddenGenreCount}`}
                </button>
              ) : null}
            </div>
          ) : null}

          <ExplanationBlock title="Why it fits" items={primaryReasons} emptyText="No strong grounded reasons yet." />
          {showOwnerDetails ? (
            <>
              <ExplanationBlock title="Manual override effects" items={recommendation.overrideReasons} emptyText="No manual overrides materially affected this score." />
              <ExplanationBlock title="Cautions" items={recommendation.cautions} emptyText="No major grounded cautions." />
            </>
          ) : null}

          {showOwnerDetails && recommendation.similarLikedFilms.length > 0 ? (
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
