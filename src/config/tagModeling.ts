import { FILM_TAGS, type TagCategoryId } from './filmTags'

export type FeatureRole =
  | 'selection_affinity'
  | 'satisfaction_predictor'
  | 'negative_experience_signal'
  | 'neutral_descriptor'
  | 'manual_override'

export type FeatureOverride =
  | 'seek'
  | 'like_when_done_well'
  | 'neutral'
  | 'avoid'
  | 'ignore'

export type TagMetadata = {
  tagId: string
  role: FeatureRole
  override?: FeatureOverride
  notes?: string
}

const categoryDefaultRole: Record<TagCategoryId, FeatureRole> = {
  genre_form: 'selection_affinity',
  tone_mood: 'satisfaction_predictor',
  style_craft: 'satisfaction_predictor',
  themes_subject: 'selection_affinity',
  narrative_experience: 'satisfaction_predictor',
}

export const TAG_METADATA_OVERRIDES: Record<string, TagMetadata> = {
  sentimental: { tagId: 'sentimental', role: 'satisfaction_predictor', override: 'like_when_done_well' },
  bleak: { tagId: 'bleak', role: 'satisfaction_predictor', override: 'like_when_done_well' },
  chaotic: { tagId: 'chaotic', role: 'negative_experience_signal', override: 'avoid' },
  fast_paced: { tagId: 'fast_paced', role: 'neutral_descriptor', override: 'neutral' },
}

export const TAG_METADATA_BY_ID: Record<string, TagMetadata> = FILM_TAGS.reduce((acc, tag) => {
  acc[tag.id] = TAG_METADATA_OVERRIDES[tag.id] ?? {
    tagId: tag.id,
    role: categoryDefaultRole[tag.category],
  }

  return acc
}, {} as Record<string, TagMetadata>)

export const getTagMetadata = (tagId: string): TagMetadata =>
  TAG_METADATA_BY_ID[tagId] ?? {
    tagId,
    role: 'manual_override',
    override: 'ignore',
    notes: 'Tag is not in FILM_TAGS and should be reviewed during normalization.',
  }
