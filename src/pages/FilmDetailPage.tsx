import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { FilmCard } from '../components/FilmCard'
import { formatFilmTag, formatWatchContext } from '../config/filmOptions'
import {
  fetchPublicFilmEntries,
  fetchPublicFilmEntryById,
} from '../services/publicFilmProfileService'
import type { FilmEntry } from '../types/film'

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'full',
  }).format(new Date(`${value}T00:00:00`))

const getTmdb = (film: FilmEntry) => film.tmdbMetadata ?? film.metadata.tmdb ?? null

const buildExcerpt = (notes: string, max = 160) => {
  const cleaned = notes.replace(/\s+/g, ' ').trim()
  if (!cleaned) return ''
  if (cleaned.length <= max) return cleaned
  return `${cleaned.slice(0, max - 1).trimEnd()}…`
}

const useDocumentMetadata = (film: FilmEntry | null) => {
  useEffect(() => {
    if (!film) return

    const previousTitle = document.title
    const tmdb = getTmdb(film)
    const yearSuffix = film.releaseYear ? ` (${film.releaseYear})` : ''
    const pageTitle = `${film.title}${yearSuffix} — Film diary`
    document.title = pageTitle

    const description = buildExcerpt(film.notes) || `A diary entry for ${film.title}${yearSuffix}.`
    const url = typeof window !== 'undefined' ? window.location.href : ''
    const image = tmdb?.posterUrl ?? ''

    const tags: Array<[string, string, string]> = [
      ['name', 'description', description],
      ['property', 'og:type', 'article'],
      ['property', 'og:title', pageTitle],
      ['property', 'og:description', description],
      ['name', 'twitter:card', image ? 'summary_large_image' : 'summary'],
      ['name', 'twitter:title', pageTitle],
      ['name', 'twitter:description', description],
    ]

    if (url) tags.push(['property', 'og:url', url])
    if (image) {
      tags.push(['property', 'og:image', image])
      tags.push(['name', 'twitter:image', image])
    }

    const created: HTMLMetaElement[] = []
    const previousValues = new Map<HTMLMetaElement, string | null>()

    for (const [attr, key, value] of tags) {
      let element = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
      if (!element) {
        element = document.createElement('meta')
        element.setAttribute(attr, key)
        document.head.appendChild(element)
        created.push(element)
      } else if (!previousValues.has(element)) {
        previousValues.set(element, element.getAttribute('content'))
      }
      element.setAttribute('content', value)
    }

    return () => {
      document.title = previousTitle
      for (const element of created) {
        element.remove()
      }
      for (const [element, previous] of previousValues) {
        if (previous === null) element.removeAttribute('content')
        else element.setAttribute('content', previous)
      }
    }
  }, [film])
}

export function FilmDetailPage() {
  const { filmId } = useParams<{ filmId: string }>()
  const [film, setFilm] = useState<FilmEntry | null>(null)
  const [related, setRelated] = useState<FilmEntry[]>([])
  const [rewatches, setRewatches] = useState<FilmEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!filmId) return

    let isMounted = true

    const load = async () => {
      if (!isMounted) return
      setIsLoading(true)
      setError(null)
      setNotFound(false)
      setFilm(null)
      setRelated([])
      setRewatches([])

      try {
        const entry = await fetchPublicFilmEntryById(filmId)

        if (!isMounted) return

        if (!entry) {
          setNotFound(true)
          return
        }

        setFilm(entry)

        try {
          const allEntries = await fetchPublicFilmEntries()
          if (!isMounted) return

          const seedTags = new Set(entry.tags)
          const sameTitleKey = `${entry.title.trim().toLowerCase()}|${entry.releaseYear ?? ''}`
          const otherWatches: FilmEntry[] = []
          const candidates: Array<{ film: FilmEntry; overlap: number }> = []

          for (const candidate of allEntries) {
            if (candidate.id === entry.id) continue
            const candidateKey = `${candidate.title.trim().toLowerCase()}|${candidate.releaseYear ?? ''}`
            if (candidateKey === sameTitleKey) {
              otherWatches.push(candidate)
              continue
            }
            const overlap = candidate.tags.reduce(
              (count, tag) => (seedTags.has(tag) ? count + 1 : count),
              0,
            )
            if (overlap > 0) {
              candidates.push({ film: candidate, overlap })
            }
          }

          const ranked = candidates
            .sort((left, right) => {
              if (right.overlap !== left.overlap) return right.overlap - left.overlap
              return (right.film.rating ?? -Infinity) - (left.film.rating ?? -Infinity)
            })
            .slice(0, 4)
            .map((item) => item.film)

          setRelated(ranked)
          setRewatches(
            otherWatches.sort((left, right) =>
              right.dateWatched.localeCompare(left.dateWatched),
            ),
          )
        } catch {
          // Related films are non-essential — failure here should not break the page.
        }
      } catch {
        if (isMounted) {
          setError('We could not load this film right now. Try again in a moment.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void load()

    return () => {
      isMounted = false
    }
  }, [filmId])

  useDocumentMetadata(film)

  const tmdb = useMemo(() => (film ? getTmdb(film) : null), [film])

  if (!filmId) {
    return <Navigate to="/" replace />
  }

  if (isLoading) {
    return (
      <section className="page">
        <div className="skeleton-list" aria-busy="true" aria-label="Loading film details">
          <div className="skeleton-card skeleton-card--card" />
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="page">
        <header className="page__hero">
          <span className="eyebrow">Film detail</span>
          <h2 className="page__title">Something went wrong</h2>
          <p className="page__copy">{error}</p>
          <p>
            <Link className="button-secondary" to="/">Back to the diary</Link>
          </p>
        </header>
      </section>
    )
  }

  if (notFound || !film) {
    return (
      <section className="page">
        <header className="page__hero">
          <span className="eyebrow">Film detail</span>
          <h2 className="page__title">Film not found</h2>
          <p className="page__copy">
            This film either isn&rsquo;t in the public diary, or its share link is no longer valid.
          </p>
          <p>
            <Link className="button-secondary" to="/">Back to the diary</Link>
          </p>
        </header>
      </section>
    )
  }

  const ratingDisplay = film.rating === null ? 'Unrated' : `${film.rating.toFixed(1)} / 5`
  const director = tmdb?.director?.trim() || null
  const runtime = typeof tmdb?.runtime === 'number' ? `${tmdb.runtime} min` : null
  const genres = tmdb?.genres?.length ? tmdb.genres.join(', ') : null
  const language = tmdb?.languages?.length ? tmdb.languages[0] : null
  const watchContextLabel = film.metadata.watchContext
    ? formatWatchContext(film.metadata.watchContext)
    : null

  return (
    <section className="page">
      <header className="page__hero">
        <span className="eyebrow">Film detail</span>
        <div className="film-detail__hero">
          <div className="film-detail__poster-wrap">
            {tmdb?.posterUrl ? (
              <img
                className="film-detail__poster"
                src={tmdb.posterUrl}
                alt={`Poster for ${film.title}`}
                loading="lazy"
              />
            ) : (
              <div
                className="film-detail__poster film-detail__poster--placeholder"
                aria-hidden="true"
              >
                No poster
              </div>
            )}
          </div>
          <div className="film-detail__hero-meta">
            <h2 className="page__title film-detail__title">
              {film.title}
              {film.releaseYear ? (
                <span className="film-detail__year"> ({film.releaseYear})</span>
              ) : null}
            </h2>
            {director ? <p className="film-detail__director">Dir. {director}</p> : null}
            <p className="meta">Watched {formatDate(film.dateWatched)}</p>
            <p className="film-detail__rating" aria-label={`Rating: ${ratingDisplay}`}>
              {ratingDisplay}
            </p>
            {film.tags.length > 0 ? (
              <div
                className="tag-row tag-row--readonly"
                aria-label={`Tags: ${film.tags.map((tag) => formatFilmTag(tag)).join(', ')}`}
              >
                {film.tags.map((tag) => (
                  <span className="tag-chip tag-chip--static" key={tag}>
                    {formatFilmTag(tag)}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className="film-detail__layout">
        <div className="film-detail__body">
          <section className="panel">
            <header className="panel__header">
              <h3 className="panel__title">Review</h3>
              {watchContextLabel ? (
                <p className="panel__subtitle">Watched at {watchContextLabel.toLowerCase()}</p>
              ) : null}
            </header>
            {film.notes ? (
              <p className="film-detail__notes">{film.notes}</p>
            ) : (
              <p className="empty-state">No notes for this watch yet.</p>
            )}
          </section>

          <section className="panel">
            <header className="panel__header">
              <h3 className="panel__title">Watch log</h3>
              <p className="panel__subtitle">
                {rewatches.length > 0
                  ? `${rewatches.length + 1} watches recorded for this film.`
                  : 'A single watch is recorded so far.'}
              </p>
            </header>
            <ul className="film-detail__watch-log">
              <li>
                <strong>{formatDate(film.dateWatched)}</strong>
                {film.metadata.firstWatch === true ? (
                  <span className="meta-pill meta-pill--accent">First watch</span>
                ) : film.metadata.firstWatch === false ? (
                  <span className="meta-pill">Rewatch</span>
                ) : null}
                {film.notes ? <p className="meta">{buildExcerpt(film.notes, 200)}</p> : null}
              </li>
              {rewatches.map((entry) => (
                <li key={entry.id}>
                  <strong>{formatDate(entry.dateWatched)}</strong>
                  {entry.metadata.firstWatch === true ? (
                    <span className="meta-pill meta-pill--accent">First watch</span>
                  ) : entry.metadata.firstWatch === false ? (
                    <span className="meta-pill">Rewatch</span>
                  ) : null}
                  {entry.rating !== null ? (
                    <span className="meta-pill">{entry.rating.toFixed(1)} / 5</span>
                  ) : null}
                  {entry.notes ? <p className="meta">{buildExcerpt(entry.notes, 200)}</p> : null}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="film-detail__sidebar">
          <section className="panel">
            <header className="panel__header">
              <h3 className="panel__title">From TMDb</h3>
            </header>
            {tmdb ? (
              <dl className="film-detail__facts">
                {director ? (
                  <div>
                    <dt>Director</dt>
                    <dd>{director}</dd>
                  </div>
                ) : null}
                {runtime ? (
                  <div>
                    <dt>Runtime</dt>
                    <dd>{runtime}</dd>
                  </div>
                ) : null}
                {genres ? (
                  <div>
                    <dt>Genres</dt>
                    <dd>{genres}</dd>
                  </div>
                ) : null}
                {language ? (
                  <div>
                    <dt>Original language</dt>
                    <dd>{language}</dd>
                  </div>
                ) : null}
                {tmdb.cast.length > 0 ? (
                  <div>
                    <dt>Cast</dt>
                    <dd>{tmdb.cast.slice(0, 6).join(', ')}</dd>
                  </div>
                ) : null}
              </dl>
            ) : (
              <p className="empty-state">No TMDb metadata for this entry yet.</p>
            )}
          </section>
        </aside>
      </div>

      {related.length > 0 ? (
        <section className="panel">
          <header className="panel__header">
            <h3 className="panel__title">Similar in my diary</h3>
            <p className="panel__subtitle">
              Other public watches that share recurring tags with this one.
            </p>
          </header>
          <div className="film-list">
            {related.map((entry) => (
              <FilmCard key={entry.id} film={entry} showLink />
            ))}
          </div>
        </section>
      ) : null}

      <p>
        <Link className="button-secondary" to="/">Back to the diary</Link>
      </p>
    </section>
  )
}
