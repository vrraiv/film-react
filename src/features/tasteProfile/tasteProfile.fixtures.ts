import type { FilmEntry } from '../../types/film'
import { buildTasteProfile } from './tasteProfile'

const makeFilm = (id: string, genre: string, rating: number): FilmEntry => ({
  id,
  title: `Film ${id}`,
  releaseYear: 2000,
  dateWatched: '2026-01-01',
  rating,
  tags: [],
  notes: '',
  isPublic: true,
  metadata: {
    dateLogged: '2026-01-01',
    firstWatch: true,
    watchContext: '',
    watchContextNote: '',
    ownedFormats: [],
    onWishlist: false,
    tmdb: {
      id: Number(id),
      title: `Film ${id}`,
      releaseYear: 2000,
      posterPath: null,
      posterUrl: null,
      director: 'Dir A',
      runtime: 110,
      genres: [genre],
      cast: [],
      keywords: [],
    },
    keywords: [],
  },
  tmdbMetadata: null,
})

export const highSampleMixedGenreFixture = (): FilmEntry[] => {
  const ratings = [5, 4.5, 4, 3.5, 3, 2.5, 4.5, 2]
  const genreFilms = ratings.map((rating, i) => makeFilm(String(i + 1), 'Thriller', rating))
  const others = [makeFilm('101', 'Romance', 4.5), makeFilm('102', 'Comedy', 4)]
  return [...genreFilms, ...others]
}

export const runTasteProfileFixtureChecks = (): void => {
  const profile = buildTasteProfile(highSampleMixedGenreFixture())
  const thriller = profile.features.find(
    (feature) => feature.feature.type === 'tmdb_genre' && feature.feature.key === 'thriller',
  )

  if (!thriller) throw new Error('Expected thriller feature in fixture')
  if (thriller.classification !== 'high_interest_mixed_results') {
    throw new Error(`Expected high_interest_mixed_results, got ${thriller.classification}`)
  }
}
