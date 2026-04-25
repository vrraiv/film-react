import type { OwnedMediaFormat, WatchContext } from '../types/film'

export type TasteTagCategoryId =
  | 'mood'
  | 'pace'
  | 'craft'
  | 'theme'
  | 'performance'

export type TasteTagCategory = {
  id: TasteTagCategoryId
  label: string
  description: string
  tags: string[]
}

export const watchContextOptions: Array<{
  value: WatchContext
  label: string
}> = [
  { value: 'theatre', label: 'Theatre' },
  { value: 'home', label: 'Home' },
  { value: 'airplane', label: 'Airplane' },
  { value: 'friend-family-home', label: "Friend or family's home" },
  { value: 'other', label: 'Other' },
]

export const ownedMediaOptions: Array<{
  value: OwnedMediaFormat
  label: string
}> = [
  { value: '4k-uhd', label: '4K UHD' },
  { value: 'blu-ray', label: 'Blu-ray' },
  { value: 'dvd', label: 'DVD' },
  { value: 'vhs', label: 'VHS' },
]

export const tasteTagCategories: TasteTagCategory[] = [
  {
    id: 'mood',
    label: 'Mood',
    description: 'The emotional register you want to return to.',
    tags: [
      'melancholic',
      'romantic',
      'tense',
      'dreamlike',
      'warm',
      'playful',
      'bleak',
      'hopeful',
    ],
  },
  {
    id: 'pace',
    label: 'Pace',
    description: 'How the film moves and breathes.',
    tags: [
      'slow cinema',
      'measured',
      'propulsive',
      'restless',
      'patient',
      'elliptical',
    ],
  },
  {
    id: 'craft',
    label: 'Craft',
    description: 'The formal qualities you respond to most.',
    tags: [
      'striking cinematography',
      'precise editing',
      'strong production design',
      'memorable score',
      'formal experimentation',
      'sharp writing',
    ],
  },
  {
    id: 'theme',
    label: 'Theme',
    description: 'The ideas or subjects that keep pulling you in.',
    tags: [
      'memory',
      'identity',
      'obsession',
      'class',
      'grief',
      'intimacy',
      'alienation',
      'friendship',
    ],
  },
  {
    id: 'performance',
    label: 'Performance',
    description: 'The acting style or performer energy you value.',
    tags: [
      'ensemble cast',
      'star turn',
      'understated acting',
      'heightened acting',
      'magnetic lead',
      'supporting performances',
    ],
  },
]

export const tasteTagOptions = tasteTagCategories.flatMap((category) =>
  category.tags.map((tag) => ({
    categoryId: category.id,
    categoryLabel: category.label,
    label: tag,
    value: tag,
  })),
)

export const tasteTagLookup = new Map(
  tasteTagOptions.map((tag) => [tag.value, tag]),
)

export const normalizeTag = (value: string) => value.trim().toLowerCase()

export const formatWatchContext = (value: WatchContext | '') =>
  watchContextOptions.find((option) => option.value === value)?.label ?? 'Unspecified'

export const formatOwnedMedia = (value: OwnedMediaFormat) =>
  ownedMediaOptions.find((option) => option.value === value)?.label ?? value
