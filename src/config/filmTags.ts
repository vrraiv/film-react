export type TagCategoryId =
  | 'genre_form'
  | 'tone_mood'
  | 'style_craft'
  | 'themes_subject'
  | 'narrative_experience'

export type FilmTag = {
  id: string
  label: string
  category: TagCategoryId
}

export type TagCategoryConfig = {
  id: TagCategoryId
  label: string
  description: string
  maxSelected: number
}

export type RatingValue = 0.5 | 1 | 1.5 | 2 | 2.5 | 3 | 3.5 | 4 | 4.5 | 5

export type RatingConfig = {
  value: RatingValue
  label: string
  description: string
}

export const TAG_CATEGORIES: TagCategoryConfig[] = [
  {
    id: 'genre_form',
    label: 'Genre / Form',
    description: 'What the film basically is',
    maxSelected: 3,
  },
  {
    id: 'tone_mood',
    label: 'Tone / Mood',
    description: 'How the film feels',
    maxSelected: 4,
  },
  {
    id: 'style_craft',
    label: 'Style / Craft',
    description: 'How the film is made',
    maxSelected: 4,
  },
  {
    id: 'themes_subject',
    label: 'Themes / Subject Matter',
    description: 'What the film is about',
    maxSelected: 5,
  },
  {
    id: 'narrative_experience',
    label: 'Narrative / Experience',
    description: 'How the film works as an experience',
    maxSelected: 3,
  },
] as const

export const FILM_TAGS: FilmTag[] = [
  { id: 'action', label: 'Action', category: 'genre_form' },
  { id: 'adventure', label: 'Adventure', category: 'genre_form' },
  { id: 'biopic', label: 'Biopic', category: 'genre_form' },
  { id: 'childrens', label: "Children's", category: 'genre_form' },
  { id: 'drama', label: 'Drama', category: 'genre_form' },
  { id: 'comedy', label: 'Comedy', category: 'genre_form' },
  { id: 'thriller', label: 'Thriller', category: 'genre_form' },
  { id: 'horror', label: 'Horror', category: 'genre_form' },
  { id: 'sci_fi', label: 'Sci-Fi', category: 'genre_form' },
  { id: 'fantasy', label: 'Fantasy', category: 'genre_form' },
  { id: 'romance', label: 'Romance', category: 'genre_form' },
  { id: 'crime', label: 'Crime', category: 'genre_form' },
  { id: 'documentary', label: 'Documentary', category: 'genre_form' },
  { id: 'animation', label: 'Animation', category: 'genre_form' },
  { id: 'musical', label: 'Musical', category: 'genre_form' },
  { id: 'mystery', label: 'Mystery', category: 'genre_form' },
  { id: 'western', label: 'Western', category: 'genre_form' },
  { id: 'war', label: 'War', category: 'genre_form' },
  { id: 'experimental', label: 'Experimental', category: 'genre_form' },
  { id: 'bleak', label: 'Bleak', category: 'tone_mood' },
  { id: 'warm', label: 'Warm', category: 'tone_mood' },
  { id: 'melancholic', label: 'Melancholic', category: 'tone_mood' },
  { id: 'tense', label: 'Tense', category: 'tone_mood' },
  { id: 'dreamlike', label: 'Dreamlike', category: 'tone_mood' },
  { id: 'playful', label: 'Playful', category: 'tone_mood' },
  { id: 'deadpan', label: 'Deadpan', category: 'tone_mood' },
  { id: 'sentimental', label: 'Sentimental', category: 'tone_mood' },
  { id: 'austere', label: 'Austere', category: 'tone_mood' },
  { id: 'chaotic', label: 'Chaotic', category: 'tone_mood' },
  { id: 'romantic_tone', label: 'Romantic', category: 'tone_mood' },
  { id: 'ironic', label: 'Ironic', category: 'tone_mood' },
  { id: 'menacing', label: 'Menacing', category: 'tone_mood' },
  { id: 'meditative', label: 'Meditative', category: 'tone_mood' },
  { id: 'exuberant', label: 'Exuberant', category: 'tone_mood' },
  { id: 'visually_striking', label: 'Visually Striking', category: 'style_craft' },
  { id: 'stylized', label: 'Stylized', category: 'style_craft' },
  { id: 'naturalistic', label: 'Naturalistic', category: 'style_craft' },
  { id: 'minimalist', label: 'Minimalist', category: 'style_craft' },
  { id: 'maximalist', label: 'Maximalist', category: 'style_craft' },
  { id: 'slow_cinema', label: 'Slow Cinema', category: 'style_craft' },
  { id: 'fast_paced', label: 'Fast-Paced', category: 'style_craft' },
  { id: 'dialogue_driven', label: 'Dialogue-Driven', category: 'style_craft' },
  { id: 'performance_led', label: 'Performance-Led', category: 'style_craft' },
  { id: 'ensemble', label: 'Ensemble', category: 'style_craft' },
  { id: 'nonlinear', label: 'Nonlinear', category: 'style_craft' },
  { id: 'voiceover_heavy', label: 'Voiceover-Heavy', category: 'style_craft' },
  { id: 'improvisational', label: 'Improvisational', category: 'style_craft' },
  { id: 'formalist', label: 'Formalist', category: 'style_craft' },
  { id: 'sensory', label: 'Sensory', category: 'style_craft' },
  { id: 'family', label: 'Family', category: 'themes_subject' },
  { id: 'marriage', label: 'Marriage', category: 'themes_subject' },
  { id: 'friendship', label: 'Friendship', category: 'themes_subject' },
  { id: 'coming_of_age', label: 'Coming of Age', category: 'themes_subject' },
  { id: 'class', label: 'Class', category: 'themes_subject' },
  { id: 'work', label: 'Work', category: 'themes_subject' },
  { id: 'art_artists', label: 'Art / Artists', category: 'themes_subject' },
  { id: 'politics', label: 'Politics', category: 'themes_subject' },
  { id: 'religion', label: 'Religion', category: 'themes_subject' },
  { id: 'nature', label: 'Nature', category: 'themes_subject' },
  { id: 'environment', label: 'Environment', category: 'themes_subject' },
  { id: 'duty', label: 'Duty', category: 'themes_subject' },
  { id: 'trauma', label: 'Trauma', category: 'themes_subject' },
  { id: 'grief', label: 'Grief', category: 'themes_subject' },
  { id: 'memory', label: 'Memory', category: 'themes_subject' },
  { id: 'identity', label: 'Identity', category: 'themes_subject' },
  { id: 'alienation', label: 'Alienation', category: 'themes_subject' },
  { id: 'obsession', label: 'Obsession', category: 'themes_subject' },
  { id: 'moral_compromise', label: 'Moral Compromise', category: 'themes_subject' },
  { id: 'masculinity', label: 'Masculinity', category: 'themes_subject' },
  { id: 'parenthood', label: 'Parenthood', category: 'themes_subject' },
  { id: 'colonialism', label: 'Colonialism', category: 'themes_subject' },
  { id: 'technology', label: 'Technology', category: 'themes_subject' },
  { id: 'justice', label: 'Justice', category: 'themes_subject' },
  { id: 'character_study', label: 'Character Study', category: 'narrative_experience' },
  { id: 'mystery_driven', label: 'Mystery-Driven', category: 'narrative_experience' },
  { id: 'plot_driven', label: 'Plot-Driven', category: 'narrative_experience' },
  { id: 'hangout_movie', label: 'Hangout Movie', category: 'narrative_experience' },
  { id: 'road_movie', label: 'Road Movie', category: 'narrative_experience' },
  { id: 'chamber_piece', label: 'Chamber Piece', category: 'narrative_experience' },
  { id: 'epic_scale', label: 'Epic Scale', category: 'narrative_experience' },
  { id: 'slice_of_life', label: 'Slice of Life', category: 'narrative_experience' },
  { id: 'psychological', label: 'Psychological', category: 'narrative_experience' },
  { id: 'allegorical', label: 'Allegorical', category: 'narrative_experience' },
  { id: 'satirical', label: 'Satirical', category: 'narrative_experience' },
  { id: 'procedural', label: 'Procedural', category: 'narrative_experience' },
  { id: 'tragic_arc', label: 'Tragic Arc', category: 'narrative_experience' },
  { id: 'redemption_arc', label: 'Redemption Arc', category: 'narrative_experience' },
  { id: 'ambiguous_ending', label: 'Ambiguous Ending', category: 'narrative_experience' },
  { id: 'twist_driven', label: 'Twist-Driven', category: 'narrative_experience' },
  { id: 'world_building', label: 'World-Building', category: 'narrative_experience' },
] as const

export const RATING_OPTIONS: RatingConfig[] = [
  { value: 5, label: '5.0', description: 'Personal masterpiece; exceptional; would strongly recommend' },
  { value: 4.5, label: '4.5', description: 'Excellent; near-masterpiece; minor reservations only' },
  { value: 4, label: '4.0', description: 'Very good; strongly worthwhile' },
  { value: 3.5, label: '3.5', description: 'Good; clear strengths, some limitations' },
  { value: 3, label: '3.0', description: 'Solid/mixed-positive; worthwhile but not strongly distinctive' },
  { value: 2.5, label: '2.5', description: 'Mixed; some value, but substantial issues' },
  { value: 2, label: '2.0', description: 'Weak; limited appeal or execution problems' },
  { value: 1.5, label: '1.5', description: 'Poor; few redeeming qualities' },
  { value: 1, label: '1.0', description: 'Very poor; actively disliked' },
  { value: 0.5, label: '0.5', description: 'Reserved for unusually bad or failed viewing experiences' },
] as const

const TAGS_BY_ID = new Map(FILM_TAGS.map((tag) => [tag.id, tag]))
const CATEGORIES_BY_ID = new Map(TAG_CATEGORIES.map((category) => [category.id, category]))
const RATINGS_BY_VALUE = new Map(RATING_OPTIONS.map((rating) => [rating.value, rating]))

export const TAGS_BY_CATEGORY = TAG_CATEGORIES.reduce((acc, category) => {
  acc[category.id] = FILM_TAGS.filter((tag) => tag.category === category.id)
  return acc
}, {} as Record<TagCategoryId, FilmTag[]>)

export const getTagsByCategory = (categoryId: TagCategoryId) => TAGS_BY_CATEGORY[categoryId]
export const getTagById = (tagId: string) => TAGS_BY_ID.get(tagId)
export const getCategoryById = (categoryId: TagCategoryId) => CATEGORIES_BY_ID.get(categoryId)
export const getRatingConfig = (value: RatingValue) => RATINGS_BY_VALUE.get(value)
