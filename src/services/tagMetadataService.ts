import { TAG_METADATA_BY_ID, type FeatureOverride, type FeatureRole, type TagMetadata } from '../config/tagModeling'
import { supabase } from '../lib/supabaseClient'

export type TagMetadataRow = {
  tag_id: string
  role: FeatureRole
  override: FeatureOverride | null
  notes: string | null
}

const columns = 'tag_id, role, override, notes'

export const fetchTagMetadata = async (): Promise<Record<string, TagMetadata>> => {
  const { data, error } = await supabase
    .from('tag_metadata')
    .select(columns)
    .returns<TagMetadataRow[]>()

  if (error) {
    throw new Error(`Could not load tag metadata: ${error.message}`)
  }

  const overrides = (data ?? []).reduce((acc, row) => {
    acc[row.tag_id] = {
      tagId: row.tag_id,
      role: row.role,
      override: row.override ?? undefined,
      notes: row.notes ?? undefined,
    }
    return acc
  }, {} as Record<string, TagMetadata>)

  return {
    ...TAG_METADATA_BY_ID,
    ...overrides,
  }
}

export const upsertTagMetadata = async (userId: string, metadata: TagMetadata): Promise<void> => {
  const { error } = await supabase
    .from('tag_metadata')
    .upsert({
      user_id: userId,
      tag_id: metadata.tagId,
      role: metadata.role,
      override: metadata.override ?? null,
      notes: metadata.notes ?? null,
    }, { onConflict: 'user_id,tag_id' })

  if (error) {
    throw new Error(`Could not save tag metadata: ${error.message}`)
  }
}
