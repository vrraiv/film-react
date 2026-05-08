import { useState } from 'react'
import {
  FILM_TAGS,
  TAG_CATEGORIES,
  TAGS_BY_CATEGORY,
  getTagById,
} from '../config/filmTags'

type TagInputProps = {
  selectedTags: string[]
  onChange: (tags: string[]) => void
}

export function TagInput({ selectedTags, onChange }: TagInputProps) {
  const selectedSet = new Set(selectedTags)
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({})
  const toggleCategory = (id: string) =>
    setOpenCategories((current) => ({ ...current, [id]: !current[id] }))

  const toggleTag = (tagId: string) => {
    if (selectedSet.has(tagId)) {
      onChange(selectedTags.filter((value) => value !== tagId))
      return
    }

    const tag = getTagById(tagId)
    if (!tag) return

    const selectedInCategory = selectedTags.filter(
      (value) => getTagById(value)?.category === tag.category,
    ).length

    const maxAllowed = TAG_CATEGORIES.find((category) => category.id === tag.category)?.maxSelected ?? Infinity

    if (selectedInCategory >= maxAllowed) {
      return
    }

    onChange([...selectedTags, tagId])
  }

  return (
    <div className="tag-input">
      <div className="field">
        <label>Film tags</label>
      </div>

      <div className="tag-input__selected" aria-live="polite">
        {selectedTags.length === 0 ? (
          <p className="meta">No film tags selected yet.</p>
        ) : (
          selectedTags.map((tagId) => (
            <button key={tagId} className="tag-chip" type="button" onClick={() => toggleTag(tagId)}>
              <span>{getTagById(tagId)?.label ?? tagId}</span>
              <span className="tag-chip__remove" aria-hidden="true">x</span>
            </button>
          ))
        )}
      </div>

      <div className="tag-input__suggestions">
        {TAG_CATEGORIES.map((category) => {
          const categoryTags = TAGS_BY_CATEGORY[category.id]
          const selectedInCategory = selectedTags.filter(
            (value) => getTagById(value)?.category === category.id,
          ).length
          const isAtLimit = selectedInCategory >= category.maxSelected

          const isOpen = openCategories[category.id] ?? false
          const groupId = `tag-group-${category.id}`
          return (
            <div key={category.id} className="tag-suggestion-group">
              <button
                type="button"
                className="tag-suggestion-group__header"
                aria-expanded={isOpen}
                aria-controls={groupId}
                onClick={() => toggleCategory(category.id)}
              >
                <span className="tag-suggestion-group__heading">
                  <strong>{category.label}</strong>
                  <span className="meta">{category.description}</span>
                </span>
                <span className="tag-suggestion-group__count">
                  {selectedInCategory}/{category.maxSelected}
                </span>
              </button>
              {isOpen ? (
                <div className="tag-row" id={groupId}>
                  {categoryTags.map((tag) => {
                    const selected = selectedSet.has(tag.id)
                    return (
                      <button
                        key={tag.id}
                        className="tag-chip tag-chip--suggestion"
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        disabled={!selected && isAtLimit}
                        aria-pressed={selected}
                      >
                        {tag.label}
                      </button>
                    )
                  })}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      <p className="meta">Controlled vocabulary: {FILM_TAGS.length} intrinsic film tags.</p>
    </div>
  )
}
