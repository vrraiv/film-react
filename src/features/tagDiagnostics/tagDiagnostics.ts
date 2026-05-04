import { getTagMetadata } from '../../config/tagModeling'
import { getTagById } from '../../config/filmTags'
import type { FilmEntry } from '../../types/film'

export type TagUsageDiagnostic = {
  tagId: string
  label: string
  filmsCount: number
  ratedFilmsCount: number
  averageRating: number | null
  shareRatedAtLeast4: number | null
  shareRatedAtLeast45: number | null
  role: ReturnType<typeof getTagMetadata>['role']
  override?: ReturnType<typeof getTagMetadata>['override']
}

export type TagUsageSummary = {
  totalLoggedFilms: number
  tags: TagUsageDiagnostic[]
  lowUsageTags: TagUsageDiagnostic[]
  highUsageTags: TagUsageDiagnostic[]
}

export const buildTagUsageSummary = (
  films: FilmEntry[],
  thresholds: { lowUsageMaxCount?: number; highUsageMinCount?: number } = {},
): TagUsageSummary => {
  const lowUsageMaxCount = thresholds.lowUsageMaxCount ?? 2
  const highUsageMinCount = thresholds.highUsageMinCount ?? 10

  const statsByTag = new Map<string, { filmsCount: number; ratings: number[] }>()

  for (const film of films) {
    for (const tagId of film.tags) {
      const previous = statsByTag.get(tagId) ?? { filmsCount: 0, ratings: [] }
      statsByTag.set(tagId, {
        filmsCount: previous.filmsCount + 1,
        ratings: film.rating === null ? previous.ratings : [...previous.ratings, film.rating],
      })
    }
  }

  const tags = [...statsByTag.entries()]
    .map(([tagId, stats]): TagUsageDiagnostic => {
      const ratedFilmsCount = stats.ratings.length
      const averageRating = ratedFilmsCount > 0
        ? stats.ratings.reduce((sum, rating) => sum + rating, 0) / ratedFilmsCount
        : null
      const high4 = ratedFilmsCount > 0
        ? stats.ratings.filter((rating) => rating >= 4).length / ratedFilmsCount
        : null
      const high45 = ratedFilmsCount > 0
        ? stats.ratings.filter((rating) => rating >= 4.5).length / ratedFilmsCount
        : null
      const metadata = getTagMetadata(tagId)

      return {
        tagId,
        label: getTagById(tagId)?.label ?? tagId,
        filmsCount: stats.filmsCount,
        ratedFilmsCount,
        averageRating,
        shareRatedAtLeast4: high4,
        shareRatedAtLeast45: high45,
        role: metadata.role,
        override: metadata.override,
      }
    })
    .sort((left, right) => right.filmsCount - left.filmsCount || left.label.localeCompare(right.label))

  return {
    totalLoggedFilms: films.length,
    tags,
    lowUsageTags: tags.filter((tag) => tag.filmsCount <= lowUsageMaxCount),
    highUsageTags: tags.filter((tag) => tag.filmsCount >= highUsageMinCount),
  }
}
