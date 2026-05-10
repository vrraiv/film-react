import { useMemo, useState, type ChangeEvent } from 'react'
import { useAuth } from '../../auth/useAuth'
import { TagInput } from '../../components/TagInput'
import { useFilms } from '../../hooks/useFilms'
import { createSupabaseFilmLogService } from '../../services/filmLogService'
import {
  fetchTmdbMovieDetails,
  searchTmdbMovies,
  TmdbServiceError,
  type TmdbSearchResult,
} from '../../services/tmdbService'
import type { FilmEntry, FilmTmdbMetadata, TmdbMatchStatus } from '../../types/film'
import { parseLetterboxdFiles } from './csv'
import { importSelectedLetterboxdCandidates } from './importExecution'
import {
  planLetterboxdImport,
  type LetterboxdImportCandidate,
  type LetterboxdImportStatus,
} from './importPlan'
import { getFuzzyTitleMatchScore, normalizeTitleForImport } from './matching'
import type {
  LetterboxdFileSummary,
  LetterboxdParseIssue,
  LetterboxdParsedRow,
} from './types'

type TmdbAttemptResult =
  | 'matched'
  | 'needs_review'
  | 'no_match'
  | 'tmdb_failed'
  | 'save_failed'
type ImportAdminTab = 'import' | 'tags' | 'tmdb'
type TmdbReviewFilter = 'all' | 'needs_review'
type TmdbCandidateSearchDraft = {
  query: string
  year: string
}

const statusLabels: Record<LetterboxdImportStatus, string> = {
  new: 'New',
  'rating-only': 'Rating only',
  'possible-rewatch': 'Possible rewatch',
  'rating-merge': 'Merge rating',
  duplicate: 'Duplicate',
  'file-duplicate': 'CSV duplicate',
}

const tmdbStatusLabels: Record<TmdbMatchStatus, string> = {
  not_attempted: 'Not attempted',
  matched: 'Matched',
  needs_review: 'Needs review',
  no_match: 'No match',
}

const formatRating = (rating: number | null) =>
  rating === null ? 'Unrated' : `${rating.toFixed(1)} / 5`

const formatRewatch = (rewatch: boolean | null) => {
  if (rewatch === null) {
    return 'Unknown'
  }

  return rewatch ? 'Yes' : 'No'
}

const getTmdbResultYear = (result: TmdbSearchResult) =>
  result.release_date?.slice(0, 4) ?? ''

const findConfidentTmdbMatch = (
  film: FilmEntry,
  results: TmdbSearchResult[],
) => {
  const normalizedFilmTitle = normalizeTitleForImport(film.title)

  return results.find((result) => {
    const titleMatches = normalizeTitleForImport(result.title) === normalizedFilmTitle
    if (!titleMatches) {
      return false
    }

    if (!film.releaseYear) {
      return true
    }

    return getTmdbResultYear(result) === String(film.releaseYear)
  })
}

const getFuzzyReviewReason = (
  film: FilmEntry,
  result: TmdbSearchResult,
  titleScore: number,
) => {
  const resultYear = getTmdbResultYear(result)
  const reasons: string[] = []

  if (titleScore < 1) {
    reasons.push('title differs')
  }

  if (film.releaseYear && resultYear && resultYear !== String(film.releaseYear)) {
    reasons.push(`year differs: diary ${film.releaseYear}, TMDb ${resultYear}`)
  }

  return reasons.length > 0 ? reasons.join('; ') : 'possible fuzzy title match'
}

const findFuzzyTmdbMatch = (
  film: FilmEntry,
  results: TmdbSearchResult[],
) => {
  const scoredResults = results
    .map((result) => {
      const titleScore = getFuzzyTitleMatchScore(film.title, result.title)
      const resultYear = getTmdbResultYear(result)
      const yearDelta =
        film.releaseYear && resultYear
          ? Math.abs(Number(resultYear) - film.releaseYear)
          : 0
      const yearPenalty = yearDelta === 0 ? 0 : yearDelta <= 2 ? 0.05 : 0.25

      return {
        result,
        score: titleScore - yearPenalty,
        titleScore,
        yearDelta,
      }
    })
    .filter((match) => match.titleScore >= 0.85 && match.yearDelta <= 2)
    .sort((left, right) => right.score - left.score)

  const bestMatch = scoredResults[0]

  if (!bestMatch) {
    return null
  }

  return {
    result: bestMatch.result,
    reason: getFuzzyReviewReason(film, bestMatch.result, bestMatch.titleScore),
  }
}

const toTmdbMetadata = (details: FilmTmdbMetadata): FilmTmdbMetadata => ({
  id: details.id,
  title: details.title,
  releaseYear: details.releaseYear,
  posterPath: details.posterPath,
  posterUrl: details.posterUrl,
  director: details.director,
  runtime: details.runtime,
  genres: details.genres,
  cast: details.cast,
})

const isLetterboxdImport = (film: FilmEntry) =>
  film.metadata.source === 'letterboxd'

const sortByWatchedDate = (films: FilmEntry[]) =>
  [...films].sort((left, right) => right.dateWatched.localeCompare(left.dateWatched))

const getTmdbErrorMessage = (error: unknown, title?: string) => {
  if (error instanceof TmdbServiceError) {
    return error.message
  }

  if (error instanceof Error) {
    return title
      ? `Could not try TMDb matching for "${title}": ${error.message}`
      : `Could not try TMDb matching: ${error.message}`
  }

  const detail =
    typeof error === 'string'
      ? error
      : error === null
        ? 'null'
        : typeof error

  return title
    ? `Could not try TMDb matching for "${title}": ${detail}`
    : `Could not try TMDb matching: ${detail}`
}

export function LetterboxdImportPage() {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const filmLogService = useMemo(
    () => (userId ? createSupabaseFilmLogService(userId) : null),
    [userId],
  )
  const { films, isLoading, error, reloadFilms } = useFilms(
    filmLogService ?? undefined,
  )
  const [activeTab, setActiveTab] = useState<ImportAdminTab>('import')
  const [tmdbReviewFilter, setTmdbReviewFilter] = useState<TmdbReviewFilter>('all')
  const [parsedRows, setParsedRows] = useState<LetterboxdParsedRow[]>([])
  const [parseIssues, setParseIssues] = useState<LetterboxdParseIssue[]>([])
  const [fileSummaries, setFileSummaries] = useState<LetterboxdFileSummary[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isParsing, setIsParsing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [tagDrafts, setTagDrafts] = useState<Record<string, string[]>>({})
  const [savingTagFilmId, setSavingTagFilmId] = useState<string | null>(null)
  const [isPublishingImports, setIsPublishingImports] = useState(false)
  const [publishMessage, setPublishMessage] = useState<string | null>(null)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [tagMessage, setTagMessage] = useState<string | null>(null)
  const [tagError, setTagError] = useState<string | null>(null)
  const [tmdbBusyIds, setTmdbBusyIds] = useState<Set<string>>(new Set())
  const [isBulkMatchingTmdb, setIsBulkMatchingTmdb] = useState(false)
  const [bulkTmdbProgress, setBulkTmdbProgress] = useState<string | null>(null)
  const [tmdbCandidateSearchDrafts, setTmdbCandidateSearchDrafts] = useState<
    Record<string, TmdbCandidateSearchDraft>
  >({})
  const [tmdbCandidateSearchResults, setTmdbCandidateSearchResults] = useState<
    Record<string, TmdbSearchResult[]>
  >({})
  const [tmdbCandidateSearchBusyId, setTmdbCandidateSearchBusyId] = useState<string | null>(null)
  const [tmdbMessage, setTmdbMessage] = useState<string | null>(null)
  const [tmdbError, setTmdbError] = useState<string | null>(null)

  const candidates = useMemo(
    () => planLetterboxdImport(parsedRows, films),
    [films, parsedRows],
  )
  const selectedCount = candidates.filter(
    (candidate) => candidate.canSelect && selectedIds.has(candidate.id),
  ).length
  const selectableCount = candidates.filter((candidate) => candidate.canSelect).length
  const letterboxdImportedFilms = useMemo(
    () => sortByWatchedDate(films.filter(isLetterboxdImport)),
    [films],
  )
  const importedFilmsMissingTags = useMemo(
    () => letterboxdImportedFilms.filter((film) => film.tags.length === 0),
    [letterboxdImportedFilms],
  )
  const privateLetterboxdImportedFilms = useMemo(
    () => letterboxdImportedFilms.filter((film) => !film.isPublic),
    [letterboxdImportedFilms],
  )
  const importedFilmsNeedingTmdb = useMemo(
    () =>
      letterboxdImportedFilms.filter(
        (film) =>
          !film.metadata.tmdb?.id &&
          !film.metadata.tmdbReviewCandidate &&
          !(
            film.metadata.tmdbMatchStatus === 'no_match' &&
            film.metadata.tmdbReviewReason
          ),
      ),
    [letterboxdImportedFilms],
  )
  const importedFilmsNeedingTmdbReview = useMemo(
    () =>
      letterboxdImportedFilms.filter(
        (film) =>
          film.metadata.tmdbMatchStatus === 'needs_review' ||
          Boolean(film.metadata.tmdbReviewCandidate),
      ),
    [letterboxdImportedFilms],
  )
  const tmdbReviewFilms = useMemo(
    () =>
      tmdbReviewFilter === 'needs_review'
        ? importedFilmsNeedingTmdbReview
        : letterboxdImportedFilms,
    [importedFilmsNeedingTmdbReview, letterboxdImportedFilms, tmdbReviewFilter],
  )

  const handleFileSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    setImportMessage(null)
    setImportError(null)
    setParsedRows([])
    setParseIssues([])
    setFileSummaries([])

    if (files.length === 0) {
      return
    }

    setIsParsing(true)

    try {
      const result = await parseLetterboxdFiles(files)
      const nextCandidates = planLetterboxdImport(result.rows, films)
      setParsedRows(result.rows)
      setSelectedIds(
        new Set(
          nextCandidates
            .filter((candidate) => candidate.selectedByDefault)
            .map((candidate) => candidate.id),
        ),
      )
      setParseIssues(result.issues)
      setFileSummaries(result.summaries)
    } catch (parseError) {
      console.error(parseError)
      setParseIssues([
        {
          fileName: 'CSV selection',
          message: 'Could not parse the selected CSV files.',
        },
      ])
    } finally {
      setIsParsing(false)
    }
  }

  const toggleSelected = (candidate: LetterboxdImportCandidate) => {
    if (!candidate.canSelect) {
      return
    }

    setSelectedIds((current) => {
      const next = new Set(current)

      if (next.has(candidate.id)) {
        next.delete(candidate.id)
      } else {
        next.add(candidate.id)
      }

      return next
    })
  }

  const selectAllImportableRows = () => {
    setSelectedIds(
      new Set(
        candidates
          .filter((candidate) => candidate.canSelect)
          .map((candidate) => candidate.id),
      ),
    )
  }

  const clearSelectedRows = () => {
    setSelectedIds(new Set())
  }

  const handleImportSelectedRows = async () => {
    if (!filmLogService || selectedCount === 0) {
      return
    }

    setIsImporting(true)
    setImportError(null)
    setImportMessage(null)

    try {
      const result = await importSelectedLetterboxdCandidates(
        candidates,
        selectedIds,
        filmLogService,
      )
      setParsedRows([])
      setSelectedIds(new Set())
      setImportMessage(
        `Imported ${result.created.length} new ${result.created.length === 1 ? 'entry' : 'entries'} and updated ${result.updated.length} existing ${result.updated.length === 1 ? 'entry' : 'entries'}. Skipped ${result.skippedCount}.`,
      )
      await reloadFilms()
      setActiveTab('tags')
    } catch (saveError) {
      console.error(saveError)
      setImportError('Could not import the selected Letterboxd rows.')
    } finally {
      setIsImporting(false)
    }
  }

  const saveTagsForFilm = async (film: FilmEntry) => {
    if (!filmLogService) {
      return
    }

    setSavingTagFilmId(film.id)
    setTagMessage(null)
    setTagError(null)

    try {
      await filmLogService.updateEntry({
        ...film,
        tags: tagDrafts[film.id] ?? [],
      })
      setTagMessage(`Saved tags for "${film.title}".`)
      await reloadFilms()
    } catch (saveError) {
      console.error(saveError)
      setTagError(`Could not save tags for "${film.title}".`)
    } finally {
      setSavingTagFilmId(null)
    }
  }

  const publishImportedRows = async () => {
    if (!filmLogService) {
      return
    }

    setIsPublishingImports(true)
    setPublishMessage(null)
    setPublishError(null)

    try {
      const publishedCount = await filmLogService.publishImportedEntries()
      setPublishMessage(
        `Published ${publishedCount} imported ${publishedCount === 1 ? 'entry' : 'entries'}.`,
      )
      await reloadFilms()
    } catch (publishError) {
      console.error(publishError)
      setPublishError('Could not publish imported film entries.')
    } finally {
      setIsPublishingImports(false)
    }
  }

  const setTmdbBusy = (filmId: string, isBusy: boolean) => {
    setTmdbBusyIds((current) => {
      const next = new Set(current)

      if (isBusy) {
        next.add(filmId)
      } else {
        next.delete(filmId)
      }

      return next
    })
  }

  const tryTmdbMatchForFilm = async (
    film: FilmEntry,
    reloadAfterMatch = true,
  ): Promise<TmdbAttemptResult> => {
    if (!filmLogService) {
      return 'save_failed'
    }

    setTmdbBusy(film.id, true)
    setTmdbError(null)
    setTmdbMessage(null)

    try {
      let results: TmdbSearchResult[]
      let confidentMatch: TmdbSearchResult | undefined

      try {
        results = await searchTmdbMovies(film.title, { year: film.releaseYear })
        confidentMatch = findConfidentTmdbMatch(film, results)
      } catch (tmdbLookupError) {
        console.error(tmdbLookupError)
        setTmdbError(getTmdbErrorMessage(tmdbLookupError, film.title))
        return 'tmdb_failed'
      }

      if (!confidentMatch) {
        let broadResults: TmdbSearchResult[] = []

        try {
          broadResults = film.releaseYear
            ? await searchTmdbMovies(film.title)
            : []
        } catch (tmdbLookupError) {
          console.error(tmdbLookupError)
          setTmdbError(getTmdbErrorMessage(tmdbLookupError, film.title))
        }

        const resultsById = new Map<number, TmdbSearchResult>()

        for (const result of [...results, ...broadResults]) {
          resultsById.set(result.id, result)
        }

        const fuzzyMatch = findFuzzyTmdbMatch(film, [...resultsById.values()])

        if (fuzzyMatch) {
          let details: FilmTmdbMetadata

          try {
            details = await fetchTmdbMovieDetails(fuzzyMatch.result.id)
          } catch (tmdbLookupError) {
            console.error(tmdbLookupError)
            setTmdbError(getTmdbErrorMessage(tmdbLookupError, film.title))
            return 'tmdb_failed'
          }

          await filmLogService.updateEntry({
            ...film,
            metadata: {
              ...film.metadata,
              tmdbMatchStatus: 'needs_review',
              tmdbReviewCandidate: toTmdbMetadata(details),
              tmdbReviewReason: fuzzyMatch.reason,
            },
          })

          if (reloadAfterMatch) {
            await reloadFilms()
          }

          return 'needs_review'
        }

        const status: TmdbMatchStatus = resultsById.size > 0 ? 'needs_review' : 'no_match'
        await filmLogService.updateEntry({
          ...film,
          metadata: {
            ...film.metadata,
            tmdbMatchStatus: status,
            tmdbReviewCandidate: null,
            tmdbReviewReason:
              status === 'no_match' ? 'No fuzzy candidate found' : undefined,
          },
        })

        if (reloadAfterMatch) {
          await reloadFilms()
        }

        return status
      }

      let details: FilmTmdbMetadata
      try {
        details = await fetchTmdbMovieDetails(confidentMatch.id)
      } catch (tmdbLookupError) {
        console.error(tmdbLookupError)
        setTmdbError(getTmdbErrorMessage(tmdbLookupError, film.title))
        return 'tmdb_failed'
      }

      await filmLogService.updateEntry({
        ...film,
        metadata: {
          ...film.metadata,
          tmdb: toTmdbMetadata(details),
          tmdbMatchStatus: 'matched',
          tmdbReviewCandidate: null,
          tmdbReviewReason: undefined,
        },
      })

      if (reloadAfterMatch) {
        await reloadFilms()
      }

      return 'matched'
    } catch (matchError) {
      console.error(matchError)
      setTmdbError(getTmdbErrorMessage(matchError, film.title))
      return 'save_failed'
    } finally {
      setTmdbBusy(film.id, false)
    }
  }

  const acceptTmdbReviewCandidate = async (film: FilmEntry) => {
    if (!filmLogService || !film.metadata.tmdbReviewCandidate) {
      return
    }

    setTmdbBusy(film.id, true)
    setTmdbError(null)
    setTmdbMessage(null)

    try {
      await filmLogService.updateEntry({
        ...film,
        metadata: {
          ...film.metadata,
          tmdb: film.metadata.tmdbReviewCandidate,
          tmdbMatchStatus: 'matched',
          tmdbReviewCandidate: null,
          tmdbReviewReason: undefined,
        },
      })
      setTmdbMessage(`Accepted TMDb match for "${film.title}".`)
      await reloadFilms()
    } catch (saveError) {
      console.error(saveError)
      setTmdbError(getTmdbErrorMessage(saveError, film.title))
    } finally {
      setTmdbBusy(film.id, false)
    }
  }

  const getDefaultTmdbCandidateSearchDraft = (film: FilmEntry): TmdbCandidateSearchDraft => ({
    query: film.title,
    year: film.releaseYear ? String(film.releaseYear) : '',
  })

  const getTmdbCandidateSearchDraft = (film: FilmEntry) =>
    tmdbCandidateSearchDrafts[film.id] ?? getDefaultTmdbCandidateSearchDraft(film)

  const updateTmdbCandidateSearchDraft = (
    film: FilmEntry,
    nextDraft: Partial<TmdbCandidateSearchDraft>,
  ) => {
    setTmdbCandidateSearchDrafts((current) => ({
      ...current,
      [film.id]: {
        ...getDefaultTmdbCandidateSearchDraft(film),
        ...current[film.id],
        ...nextDraft,
      },
    }))
  }

  const searchTmdbCandidatesForFilm = async (film: FilmEntry) => {
    const draft = getTmdbCandidateSearchDraft(film)
    const query = draft.query.trim()
    const year = draft.year.trim()

    if (!query) {
      setTmdbError(`Enter a TMDb search title for "${film.title}".`)
      return
    }
    if (year && !/^\d{4}$/.test(year)) {
      setTmdbError(`Enter a four-digit TMDb search year for "${film.title}".`)
      return
    }

    setTmdbCandidateSearchBusyId(film.id)
    setTmdbError(null)
    setTmdbMessage(null)

    try {
      const primaryResults = await searchTmdbMovies(
        query,
        year ? { year: Number(year) } : {},
      )
      const broadResults = year ? await searchTmdbMovies(query) : []
      const resultsById = new Map<number, TmdbSearchResult>()

      for (const result of [...primaryResults, ...broadResults]) {
        resultsById.set(result.id, result)
      }

      const nextResults = [...resultsById.values()].slice(0, 6)
      setTmdbCandidateSearchResults((current) => ({
        ...current,
        [film.id]: nextResults,
      }))
      setTmdbMessage(
        nextResults.length > 0
          ? `Found ${nextResults.length} TMDb candidates for "${film.title}".`
          : `No TMDb candidates found for "${film.title}".`,
      )
    } catch (searchError) {
      console.error(searchError)
      setTmdbError(getTmdbErrorMessage(searchError, film.title))
    } finally {
      setTmdbCandidateSearchBusyId(null)
    }
  }

  const acceptTmdbSearchCandidate = async (
    film: FilmEntry,
    candidate: TmdbSearchResult,
  ) => {
    if (!filmLogService) {
      return
    }

    setTmdbBusy(film.id, true)
    setTmdbError(null)
    setTmdbMessage(null)

    try {
      const details = await fetchTmdbMovieDetails(candidate.id)
      await filmLogService.updateEntry({
        ...film,
        metadata: {
          ...film.metadata,
          tmdb: toTmdbMetadata(details),
          tmdbMatchStatus: 'matched',
          tmdbReviewCandidate: null,
          tmdbReviewReason: undefined,
        },
      })
      setTmdbCandidateSearchResults((current) => ({
        ...current,
        [film.id]: [],
      }))
      setTmdbMessage(`Accepted TMDb match for "${film.title}".`)
      await reloadFilms()
    } catch (saveError) {
      console.error(saveError)
      setTmdbError(getTmdbErrorMessage(saveError, film.title))
    } finally {
      setTmdbBusy(film.id, false)
    }
  }

  const renderTmdbCandidateSearch = (film: FilmEntry) => {
    const draft = getTmdbCandidateSearchDraft(film)
    const results = tmdbCandidateSearchResults[film.id] ?? []
    const isSearching = tmdbCandidateSearchBusyId === film.id

    if (!tmdbCandidateSearchDrafts[film.id] && results.length === 0) {
      return null
    }

    return (
      <div className="import-issues">
        <strong>Manual TMDb search</strong>
        <div className="form-grid">
          <label className="field">
            <span>Title</span>
            <input
              type="text"
              value={draft.query}
              onChange={(event) =>
                updateTmdbCandidateSearchDraft(film, { query: event.target.value })
              }
            />
          </label>
          <label className="field">
            <span>Year</span>
            <input
              type="text"
              inputMode="numeric"
              value={draft.year}
              onChange={(event) =>
                updateTmdbCandidateSearchDraft(film, { year: event.target.value })
              }
            />
          </label>
          <button
            className="button-secondary"
            type="button"
            disabled={isSearching}
            onClick={() => void searchTmdbCandidatesForFilm(film)}
          >
            {isSearching ? 'Searching...' : 'Search TMDb'}
          </button>
        </div>

        {results.length > 0 ? (
          <div className="import-tag-list">
            {results.map((candidate) => (
              <article className="import-summary" key={candidate.id}>
                <strong>{candidate.title}</strong>
                <span className="meta">
                  {getTmdbResultYear(candidate) || 'Year unknown'} - TMDb {candidate.id}
                </span>
                {candidate.overview ? <span className="meta">{candidate.overview}</span> : null}
                <button
                  className="button-primary"
                  type="button"
                  disabled={tmdbBusyIds.has(film.id)}
                  onClick={() => void acceptTmdbSearchCandidate(film, candidate)}
                >
                  Accept this TMDb match
                </button>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    )
  }

  const handleTryTmdbMatchForImportedRows = async () => {
    if (!filmLogService || importedFilmsNeedingTmdb.length === 0) {
      return
    }

    setIsBulkMatchingTmdb(true)
    setBulkTmdbProgress(null)
    setTmdbError(null)
    setTmdbMessage(null)

    const totals: Record<TmdbAttemptResult, number> = {
      matched: 0,
      needs_review: 0,
      no_match: 0,
      tmdb_failed: 0,
      save_failed: 0,
    }

    try {
      for (const [index, film] of importedFilmsNeedingTmdb.entries()) {
        setBulkTmdbProgress(
          `TMDb matching ${index + 1} of ${importedFilmsNeedingTmdb.length}: ${film.title}`,
        )
        const result = await tryTmdbMatchForFilm(film, false)
        totals[result] += 1
      }

      await reloadFilms()
      setTmdbMessage(
        `TMDb matching complete: ${totals.matched} matched, ${totals.needs_review} need review, ${totals.no_match} no match, ${totals.tmdb_failed} TMDb failed, ${totals.save_failed} save failed.`,
      )
    } catch (bulkError) {
      console.error(bulkError)
      setTmdbError(getTmdbErrorMessage(bulkError))
    } finally {
      setBulkTmdbProgress(null)
      setIsBulkMatchingTmdb(false)
    }
  }

  return (
    <section className="page letterboxd-import">
      <header className="page__hero">
        <span className="eyebrow">Admin import</span>
        <h2 className="page__title">Letterboxd CSV import</h2>
        <p className="page__copy">
          Temporary local-only CSV import for diary.csv and ratings.csv exports.
        </p>
      </header>

      <div className="import-tabs" role="tablist" aria-label="Letterboxd import steps">
        <button
          className={activeTab === 'import' ? 'button-primary' : 'button-secondary'}
          type="button"
          role="tab"
          aria-selected={activeTab === 'import'}
          onClick={() => setActiveTab('import')}
        >
          Import CSV
        </button>
        <button
          className={activeTab === 'tags' ? 'button-primary' : 'button-secondary'}
          type="button"
          role="tab"
          aria-selected={activeTab === 'tags'}
          onClick={() => setActiveTab('tags')}
        >
          Add tags to imports
        </button>
        <button
          className={activeTab === 'tmdb' ? 'button-primary' : 'button-secondary'}
          type="button"
          role="tab"
          aria-selected={activeTab === 'tmdb'}
          onClick={() => setActiveTab('tmdb')}
        >
          Review TMDb matches
        </button>
      </div>

      {error ? <p className="empty-state">{error}</p> : null}
      {importMessage ? <p className="status-message">{importMessage}</p> : null}
      {importError ? <p className="status-message status-message--error">{importError}</p> : null}

      {activeTab === 'import' ? (
        <section className="panel">
          <header className="panel__header">
            <h3 className="panel__title">Select Letterboxd CSV files</h3>
            <p className="page__copy">
              Choose diary.csv, and optionally ratings.csv. Rows are previewed before anything is written.
            </p>
          </header>

          <label className="field">
            <span>CSV files</span>
            <input
              type="file"
              accept=".csv,text/csv"
              multiple
              disabled={isLoading || isParsing || isImporting}
              onChange={(event) => void handleFileSelection(event)}
            />
          </label>

          {isLoading ? <p className="empty-state">Loading existing films for duplicate checks...</p> : null}
          {isParsing ? <p className="empty-state">Parsing selected CSV files...</p> : null}

          {fileSummaries.length > 0 ? (
            <div className="import-summary-grid">
              {fileSummaries.map((summary) => (
                <div className="import-summary" key={summary.fileName}>
                  <strong>{summary.fileName}</strong>
                  <span className="meta">
                    {summary.sourceKind} - {summary.importableRowCount} importable of {summary.rowCount} rows
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          {parseIssues.length > 0 ? (
            <div className="import-issues" role="alert">
              <strong>CSV issues</strong>
              <ul>
                {parseIssues.map((issue, index) => (
                  <li key={`${issue.fileName}-${issue.rowNumber ?? 'file'}-${index}`}>
                    {issue.fileName}
                    {issue.rowNumber ? ` row ${issue.rowNumber}` : ''}: {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {candidates.length > 0 ? (
            <>
              <div className="import-preview-actions">
                <p className="meta">
                  {selectedCount} selected of {selectableCount} importable rows. {candidates.length} total preview rows.
                </p>
                <div className="button-row">
                  <button className="button-secondary" type="button" onClick={selectAllImportableRows}>
                    Select all importable
                  </button>
                  <button className="button-secondary" type="button" onClick={clearSelectedRows}>
                    Clear selected
                  </button>
                  <button
                    className="button-primary"
                    type="button"
                    disabled={selectedCount === 0 || isImporting}
                    onClick={() => void handleImportSelectedRows()}
                  >
                    {isImporting ? 'Importing...' : 'Import selected rows'}
                  </button>
                </div>
              </div>

              <div className="import-table-wrap">
                <table className="import-table">
                  <thead>
                    <tr>
                      <th scope="col">Import</th>
                      <th scope="col">Status</th>
                      <th scope="col">Film</th>
                      <th scope="col">Watched</th>
                      <th scope="col">Rating</th>
                      <th scope="col">Rewatch</th>
                      <th scope="col">Legacy tags</th>
                      <th scope="col">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidates.map((candidate) => (
                      <tr key={candidate.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={candidate.canSelect && selectedIds.has(candidate.id)}
                            disabled={!candidate.canSelect || isImporting}
                            aria-label={`Select ${candidate.row.title}`}
                            onChange={() => toggleSelected(candidate)}
                          />
                        </td>
                        <td>
                          <span className={`import-status import-status--${candidate.status}`}>
                            {statusLabels[candidate.status]}
                          </span>
                          <span className="meta">{candidate.message}</span>
                        </td>
                        <td>
                          <strong>{candidate.row.title}</strong>
                          <span className="meta">
                            {candidate.row.releaseYear ?? 'Year unknown'} - {candidate.row.sourceFile} row {candidate.row.rowNumber}
                          </span>
                        </td>
                        <td>{candidate.row.dateWatched || '—'}</td>
                        <td>{formatRating(candidate.row.rating)}</td>
                        <td>{formatRewatch(candidate.row.rewatch)}</td>
                        <td>
                          {candidate.row.legacyTags.length
                            ? candidate.row.legacyTags.join(', ')
                            : 'None'}
                        </td>
                        <td>
                          {candidate.row.sourceUrl ? (
                            <a href={candidate.row.sourceUrl} target="_blank" rel="noreferrer">
                              Open
                            </a>
                          ) : (
                            'None'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </section>
      ) : activeTab === 'tags' ? (
        <section className="panel">
          <header className="panel__header">
            <h3 className="panel__title">Add tags to imports</h3>
            <p className="page__copy">
              Letterboxd tags stay in legacy metadata. Add the app's structured tags here.
            </p>
            <p className="meta">
              {importedFilmsMissingTags.length} imported {importedFilmsMissingTags.length === 1 ? 'film' : 'films'} missing app tags.
            </p>
            <p className="meta">
              {privateLetterboxdImportedFilms.length} imported {privateLetterboxdImportedFilms.length === 1 ? 'film is' : 'films are'} private.
            </p>
          </header>

          <div className="button-row">
            <button
              className="button-secondary"
              type="button"
              disabled={isPublishingImports || privateLetterboxdImportedFilms.length === 0}
              onClick={() => void publishImportedRows()}
            >
              {isPublishingImports
                ? 'Publishing imports...'
                : `Publish imported rows (${privateLetterboxdImportedFilms.length})`}
            </button>
            <button
              className="button-secondary"
              type="button"
              disabled={isBulkMatchingTmdb || importedFilmsNeedingTmdb.length === 0}
              onClick={() => void handleTryTmdbMatchForImportedRows()}
            >
              {isBulkMatchingTmdb
                ? 'Trying TMDb matches...'
                : `Try TMDb match for imported rows (${importedFilmsNeedingTmdb.length})`}
            </button>
          </div>

          {tagMessage ? <p className="status-message">{tagMessage}</p> : null}
          {tagError ? <p className="status-message status-message--error">{tagError}</p> : null}
          {publishMessage ? <p className="status-message">{publishMessage}</p> : null}
          {publishError ? <p className="status-message status-message--error">{publishError}</p> : null}
          {bulkTmdbProgress ? <p className="status-message">{bulkTmdbProgress}</p> : null}
          {tmdbMessage ? <p className="status-message">{tmdbMessage}</p> : null}
          {tmdbError ? <p className="status-message status-message--error">{tmdbError}</p> : null}

          {importedFilmsMissingTags.length === 0 ? (
            <div className="placeholder-card">
              <strong>No imported films are missing app tags.</strong>
              <p className="empty-state">Imported rows with source metadata will appear here when their app tags are empty.</p>
            </div>
          ) : (
            <div className="import-tag-list">
              {importedFilmsMissingTags.map((film) => (
                <article className="import-tag-row" key={film.id}>
                  <header className="import-tag-row__header">
                    <div>
                      <h4>{film.title}</h4>
                      <p className="meta">
                        {film.releaseYear ?? 'Year unknown'} - Watched {film.dateWatched} - {formatRating(film.rating)}
                      </p>
                      {film.metadata.legacyTags?.length ? (
                        <p className="meta">
                          Legacy Letterboxd tags: {film.metadata.legacyTags.join(', ')}
                        </p>
                      ) : null}
                      <p className="meta">
                        TMDb: {tmdbStatusLabels[film.metadata.tmdbMatchStatus ?? 'not_attempted']}
                        {!film.metadata.tmdbReviewCandidate && film.metadata.tmdbReviewReason
                          ? ` (${film.metadata.tmdbReviewReason})`
                          : ''}
                      </p>
                      {film.metadata.tmdbReviewCandidate ? (
                        <p className="meta">
                          Review candidate: {film.metadata.tmdbReviewCandidate.title ?? `TMDb ${film.metadata.tmdbReviewCandidate.id}`}
                          {film.metadata.tmdbReviewCandidate.releaseYear ? ` (${film.metadata.tmdbReviewCandidate.releaseYear})` : ''}
                          {film.metadata.tmdbReviewCandidate.director ? ` - ${film.metadata.tmdbReviewCandidate.director}` : ''}
                          {film.metadata.tmdbReviewReason ? ` (${film.metadata.tmdbReviewReason})` : ''}
                        </p>
                      ) : null}
                    </div>
                    <div className="button-row">
                      {film.metadata.tmdbReviewCandidate ? (
                        <button
                          className="button-primary"
                          type="button"
                          disabled={tmdbBusyIds.has(film.id)}
                          onClick={() => void acceptTmdbReviewCandidate(film)}
                        >
                          Accept TMDb candidate
                        </button>
                      ) : null}
                      <button
                        className="button-secondary"
                        type="button"
                        disabled={tmdbBusyIds.has(film.id) || Boolean(film.metadata.tmdb?.id)}
                        onClick={() => {
                          updateTmdbCandidateSearchDraft(film, {})
                          void searchTmdbCandidatesForFilm(film)
                        }}
                      >
                        {tmdbBusyIds.has(film.id)
                          ? 'Matching...'
                          : film.metadata.tmdbReviewCandidate
                            ? 'Find another TMDb match'
                            : 'Find TMDb candidates'}
                      </button>
                    </div>
                  </header>

                  {renderTmdbCandidateSearch(film)}

                  <TagInput
                    selectedTags={tagDrafts[film.id] ?? film.tags}
                    onChange={(tags) =>
                      setTagDrafts((current) => ({
                        ...current,
                        [film.id]: tags,
                      }))
                    }
                  />

                  <button
                    className="button-primary"
                    type="button"
                    disabled={savingTagFilmId === film.id || (tagDrafts[film.id] ?? []).length === 0}
                    onClick={() => void saveTagsForFilm(film)}
                  >
                    {savingTagFilmId === film.id ? 'Saving tags...' : 'Save tags'}
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="panel">
          <header className="panel__header">
            <h3 className="panel__title">Review TMDb matches</h3>
            <p className="page__copy">
              Inspect TMDb status for every Letterboxd import and accept fuzzy candidates.
            </p>
            <p className="meta">
              {letterboxdImportedFilms.length} imported {letterboxdImportedFilms.length === 1 ? 'film' : 'films'}.
              {' '}
              {importedFilmsNeedingTmdbReview.length} need review.
            </p>
          </header>

          <div className="button-row" role="group" aria-label="TMDb review filter">
            <button
              className={tmdbReviewFilter === 'all' ? 'button-primary' : 'button-secondary'}
              type="button"
              onClick={() => setTmdbReviewFilter('all')}
            >
              All imports
            </button>
            <button
              className={tmdbReviewFilter === 'needs_review' ? 'button-primary' : 'button-secondary'}
              type="button"
              onClick={() => setTmdbReviewFilter('needs_review')}
            >
              Needs review ({importedFilmsNeedingTmdbReview.length})
            </button>
            <button
              className="button-secondary"
              type="button"
              disabled={isBulkMatchingTmdb || importedFilmsNeedingTmdb.length === 0}
              onClick={() => void handleTryTmdbMatchForImportedRows()}
            >
              {isBulkMatchingTmdb
                ? 'Trying TMDb matches...'
                : `Try TMDb match for imported rows (${importedFilmsNeedingTmdb.length})`}
            </button>
          </div>

          {bulkTmdbProgress ? <p className="status-message">{bulkTmdbProgress}</p> : null}
          {tmdbMessage ? <p className="status-message">{tmdbMessage}</p> : null}
          {tmdbError ? <p className="status-message status-message--error">{tmdbError}</p> : null}

          {tmdbReviewFilms.length === 0 ? (
            <div className="placeholder-card">
              <strong>No TMDb rows match this filter.</strong>
              <p className="empty-state">Run TMDb matching or switch back to all imports.</p>
            </div>
          ) : (
            <div className="import-tag-list">
              {tmdbReviewFilms.map((film) => (
                <article className="import-tag-row" key={film.id}>
                  <header className="import-tag-row__header">
                    <div>
                      <h4>{film.title}</h4>
                      <p className="meta">
                        Diary: {film.releaseYear ?? 'Year unknown'} - Watched {film.dateWatched} - {formatRating(film.rating)}
                      </p>
                      <p className="meta">
                        TMDb status: {tmdbStatusLabels[film.metadata.tmdbMatchStatus ?? 'not_attempted']}
                        {!film.metadata.tmdbReviewCandidate && film.metadata.tmdbReviewReason
                          ? ` (${film.metadata.tmdbReviewReason})`
                          : ''}
                      </p>
                      {film.metadata.tmdb ? (
                        <p className="meta">
                          Matched: {film.metadata.tmdb.title ?? `TMDb ${film.metadata.tmdb.id}`}
                          {film.metadata.tmdb.releaseYear ? ` (${film.metadata.tmdb.releaseYear})` : ''}
                          {film.metadata.tmdb.director ? ` - ${film.metadata.tmdb.director}` : ''}
                        </p>
                      ) : null}
                      {film.metadata.tmdbReviewCandidate ? (
                        <p className="meta">
                          Review candidate: {film.metadata.tmdbReviewCandidate.title ?? `TMDb ${film.metadata.tmdbReviewCandidate.id}`}
                          {film.metadata.tmdbReviewCandidate.releaseYear ? ` (${film.metadata.tmdbReviewCandidate.releaseYear})` : ''}
                          {film.metadata.tmdbReviewCandidate.director ? ` - ${film.metadata.tmdbReviewCandidate.director}` : ''}
                          {film.metadata.tmdbReviewReason ? ` (${film.metadata.tmdbReviewReason})` : ''}
                        </p>
                      ) : null}
                    </div>
                    <div className="button-row">
                      {film.metadata.tmdbReviewCandidate ? (
                        <button
                          className="button-primary"
                          type="button"
                          disabled={tmdbBusyIds.has(film.id)}
                          onClick={() => void acceptTmdbReviewCandidate(film)}
                        >
                          Accept TMDb candidate
                        </button>
                      ) : null}
                      <button
                        className="button-secondary"
                        type="button"
                        disabled={tmdbBusyIds.has(film.id) || Boolean(film.metadata.tmdb?.id)}
                        onClick={() => {
                          updateTmdbCandidateSearchDraft(film, {})
                          void searchTmdbCandidatesForFilm(film)
                        }}
                      >
                        {tmdbBusyIds.has(film.id)
                          ? 'Matching...'
                          : film.metadata.tmdbReviewCandidate
                            ? 'Find another TMDb match'
                            : 'Find TMDb candidates'}
                      </button>
                    </div>
                  </header>
                  {renderTmdbCandidateSearch(film)}
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </section>
  )
}
