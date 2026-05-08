import { formatFilmTag } from '../../config/filmOptions'
import { getTagById } from '../../config/filmTags'
import type { FilmEntry } from '../../types/film'

type RuntimeBucket = 'short' | 'feature' | 'long' | 'epic' | 'unknown'

export type PublicTasteFilters = {
  tagOrMood: string
  runtimeBucket: RuntimeBucket | 'all'
}

export type CuratedFilm = {
  film: FilmEntry
  explanation: string
}

const NOT_FOR_EVERYONE_TAGS = new Set([
  'bleak',
  'slow_cinema',
  'austere',
  'chaotic',
  'dreamlike',
  'menacing',
])

const ratingOrZero = (film: FilmEntry) => film.rating ?? 0

const runtimeBucketForFilm = (film: FilmEntry): RuntimeBucket => {
  const runtime = film.tmdbMetadata?.runtime ?? film.metadata.tmdb?.runtime
  if (typeof runtime !== 'number') return 'unknown'
  if (runtime < 90) return 'short'
  if (runtime < 121) return 'feature'
  if (runtime < 151) return 'long'
  return 'epic'
}

const topTagsByRatedFilms = (films: FilmEntry[], limit = 3): string[] => {
  const counts = new Map<string, number>()
  films.filter((film) => film.rating !== null).forEach((film) => {
    film.tags.forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1))
  })

  return [...counts.entries()]
    .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([tag]) => tag)
}

const buildReason = (film: FilmEntry, emphasis: string) => {
  const topTags = film.tags.slice(0, 3).map((tag) => formatFilmTag(tag)).join(', ')
  const tagText = topTags ? ` Tags: ${topTags}.` : ''
  return `Included because it is ${emphasis}.${tagText}`
}

const sortByRatingThenDate = (films: FilmEntry[]) => [...films].sort((a, b) => {
  const ratingDelta = ratingOrZero(b) - ratingOrZero(a)
  if (ratingDelta !== 0) return ratingDelta
  return b.dateWatched.localeCompare(a.dateWatched)
})

const popularityOf = (film: FilmEntry): number | null => {
  const value = film.tmdbMetadata?.popularity ?? film.metadata.tmdb?.popularity
  return typeof value === 'number' ? value : null
}

// Percentile rank of TMDb popularity within the provided pool, in [0, 1].
// Films with no popularity data are assigned the median (0.5) so they aren't
// systematically penalized when TMDb data is absent.
const popularityRankMap = (films: FilmEntry[]): Map<string, number> => {
  const ranked = films
    .map((film) => ({ id: film.id, popularity: popularityOf(film) }))
    .filter((entry): entry is { id: string; popularity: number } => entry.popularity !== null)
    .sort((a, b) => a.popularity - b.popularity)

  const map = new Map<string, number>()
  const n = ranked.length
  ranked.forEach((entry, i) => map.set(entry.id, n > 1 ? i / (n - 1) : 1))
  films.forEach((film) => {
    if (!map.has(film.id)) map.set(film.id, 0.5)
  })
  return map
}

const daysSince = (iso: string): number => {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return 0
  return Math.max(0, (Date.now() - t) / 86_400_000)
}

const scoreStarterPack = (film: FilmEntry, popularityRank: number): number => {
  const rating = film.rating ?? 0
  const challenging = film.tags.some((tag) => NOT_FOR_EVERYONE_TAGS.has(tag)) ? 1 : 0
  // Rating dominates; popularity is a meaningful secondary; challenging tags push down.
  return rating + popularityRank * 1.5 - challenging * 1.0
}

const scorePersonalCanon = (film: FilmEntry, topTags: string[]): number => {
  const rating = film.rating ?? 0
  const tagSet = new Set(film.tags)
  const overlap = topTags.filter((tag) => tagSet.has(tag)).length
  const overlapNorm = topTags.length > 0 ? overlap / topTags.length : 0
  // Films held in high regard over time are stronger canon signal than recent honeymoon ratings.
  const ageBonus = Math.min(daysSince(film.dateWatched) / 365, 2) * 0.25
  return rating + overlapNorm * 1.0 + ageBonus
}

export const buildPublicTasteBrowser = (films: FilmEntry[], filters: PublicTasteFilters) => {
  const watched = films.filter((film) => film.rating !== null)
  const topTags = topTagsByRatedFilms(watched)
  const filtered = watched.filter((film) => {
    if (filters.tagOrMood && !film.tags.includes(filters.tagOrMood)) return false
    if (filters.runtimeBucket !== 'all' && runtimeBucketForFilm(film) !== filters.runtimeBucket) return false
    return true
  })

  const popularityRank = popularityRankMap(filtered)

  // Personal Canon: high-rated films aligned with recurring taste signals, weighted toward
  // ratings that have stuck over time rather than recent honeymoon picks.
  const canonScored = filtered
    .filter((film) => (film.rating ?? 0) >= 4.5)
    .map((film) => ({ film, score: scorePersonalCanon(film, topTags) }))
    .sort((a, b) => b.score - a.score || b.film.dateWatched.localeCompare(a.film.dateWatched))

  const personalCanonFilms = canonScored.slice(0, 12).map((entry) => entry.film)
  const personalCanon = personalCanonFilms.map((film) => ({
    film,
    explanation: buildReason(film, 'a sustained favorite that aligns with recurring taste signals'),
  }))

  // Starter Pack: accessible entry points — high rating + recognizable TMDb footprint,
  // penalizing challenging tags, diversified across dominant tags, capped at 2 films
  // shared with Personal Canon so the two lists differentiate.
  const starterPool = filtered.filter((film) => (film.rating ?? 0) >= 4)
  const starterScores = new Map<string, number>(
    starterPool.map((film) => [film.id, scoreStarterPack(film, popularityRank.get(film.id) ?? 0.5)]),
  )
  const ranked = [...starterPool].sort((a, b) => {
    const delta = (starterScores.get(b.id) ?? 0) - (starterScores.get(a.id) ?? 0)
    if (delta !== 0) return delta
    return b.dateWatched.localeCompare(a.dateWatched)
  })

  const canonIds = new Set(personalCanonFilms.map((film) => film.id))
  const STARTER_LIMIT = 8
  const MAX_CANON_OVERLAP = 2
  const remaining = [...ranked]
  const picked: FilmEntry[] = []
  const usedDominantTags = new Set<string>()
  let canonOverlap = 0

  const overlapBlocked = (film: FilmEntry) => canonIds.has(film.id) && canonOverlap >= MAX_CANON_OVERLAP

  while (picked.length < STARTER_LIMIT && remaining.length > 0) {
    let idx = remaining.findIndex((film) => {
      if (overlapBlocked(film)) return false
      const dom = film.tags[0]
      return dom ? !usedDominantTags.has(dom) : true
    })
    if (idx === -1) {
      // Tag-diversity exhausted; relax it but still respect the canon overlap cap.
      idx = remaining.findIndex((film) => !overlapBlocked(film))
    }
    if (idx === -1) break
    const [chosen] = remaining.splice(idx, 1)
    picked.push(chosen)
    if (chosen.tags[0]) usedDominantTags.add(chosen.tags[0])
    if (canonIds.has(chosen.id)) canonOverlap++
  }

  const starterPack = picked.map((film) => ({
    film,
    explanation: buildReason(film, 'an accessible entry point — strong rating with a recognizable TMDb footprint'),
  }))

  const bestByMoodOrTag = sortByRatingThenDate(filtered)
    .filter((film) => filters.tagOrMood ? film.tags.includes(filters.tagOrMood) : true)
    .slice(0, 10)
    .map((film) => ({ film, explanation: buildReason(film, 'highly rated and aligned with the selected mood/tag') }))

  const deepCutsCandidates = sortByRatingThenDate(filtered)
    .filter((film) => (film.rating ?? 0) >= 4)
    .filter((film) => typeof (film.tmdbMetadata?.popularity ?? film.metadata.tmdb?.popularity) === 'number')

  const deepCuts = deepCutsCandidates
    .sort((a, b) => ((a.tmdbMetadata?.popularity ?? a.metadata.tmdb?.popularity ?? Number.MAX_SAFE_INTEGER) - (b.tmdbMetadata?.popularity ?? b.metadata.tmdb?.popularity ?? Number.MAX_SAFE_INTEGER)))
    .slice(0, 8)
    .map((film) => ({ film, explanation: buildReason(film, 'highly rated and lower-popularity in TMDB data') }))

  const notForEveryone = sortByRatingThenDate(filtered)
    .filter((film) => (film.rating ?? 0) >= 4 && film.tags.some((tag) => NOT_FOR_EVERYONE_TAGS.has(tag)))
    .slice(0, 8)
    .map((film) => ({ film, explanation: buildReason(film, 'highly rated despite challenging tone/style traits') }))

  const relatedByFilm = (selectedFilmId: string): CuratedFilm[] => {
    const seed = watched.find((film) => film.id === selectedFilmId)
    if (!seed) return []

    return sortByRatingThenDate(
      watched.filter((film) => film.id !== seed.id)
        .filter((film) => film.tags.some((tag) => seed.tags.includes(tag))),
    )
      .slice(0, 8)
      .map((film) => {
        const shared = film.tags.filter((tag) => seed.tags.includes(tag)).slice(0, 3)
        const sharedText = shared.map((tag) => formatFilmTag(tag)).join(', ')
        return {
          film,
          explanation: `Included because it overlaps with ${seed.title} on recurring traits: ${sharedText}.`,
        }
      })
  }

  return {
    topTags,
    filtered,
    starterPack,
    personalCanon,
    bestByMoodOrTag,
    deepCuts,
    deepCutsDataAvailable: deepCutsCandidates.length > 0,
    notForEveryone,
    relatedByFilm,
    availableTags: [...new Set(watched.flatMap((film) => film.tags))]
      .sort((a, b) => (getTagById(a)?.label ?? a).localeCompare(getTagById(b)?.label ?? b)),
  }
}
