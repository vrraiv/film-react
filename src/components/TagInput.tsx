import { useMemo, useState } from 'react'
import {
  normalizeTag,
  tasteTagCategories,
  tasteTagLookup,
  tasteTagOptions,
} from '../config/filmOptions'

type TagInputProps = {
  selectedTags: string[]
  onChange: (tags: string[]) => void
}

const groupSuggestions = (tags: string[]) =>
  tasteTagCategories
    .map((category) => ({
      ...category,
      tags: tags.filter(
        (tag) => tasteTagLookup.get(tag)?.categoryId === category.id,
      ),
    }))
    .filter((category) => category.tags.length > 0)

export function TagInput({ selectedTags, onChange }: TagInputProps) {
  const [query, setQuery] = useState('')
  const normalizedQuery = normalizeTag(query)
  const selectedSet = useMemo(() => new Set(selectedTags), [selectedTags])

  const suggestions = useMemo(() => {
    if (!normalizedQuery) {
      return tasteTagOptions
        .filter((option) => !selectedSet.has(option.value))
        .slice(0, 12)
        .map((option) => option.value)
    }

    return tasteTagOptions
      .filter((option) => {
        if (selectedSet.has(option.value)) {
          return false
        }

        return (
          option.label.includes(normalizedQuery) ||
          option.categoryLabel.toLowerCase().includes(normalizedQuery)
        )
      })
      .slice(0, 12)
      .map((option) => option.value)
  }, [normalizedQuery, selectedSet])

  const groupedSuggestions = useMemo(
    () => groupSuggestions(suggestions),
    [suggestions],
  )

  const canCreateCustomTag =
    normalizedQuery.length > 0 && !selectedSet.has(normalizedQuery)

  const addTag = (rawValue: string) => {
    const value = normalizeTag(rawValue)

    if (!value || selectedSet.has(value)) {
      return
    }

    onChange([...selectedTags, value])
    setQuery('')
  }

  const removeTag = (tag: string) => {
    onChange(selectedTags.filter((value) => value !== tag))
  }

  return (
    <div className="tag-input">
      <div className="field">
        <label htmlFor="taste-tags">Taste tags</label>
        <input
          id="taste-tags"
          name="taste-tags"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search or create a tag"
          autoComplete="off"
        />
      </div>

      <div className="tag-input__selected" aria-live="polite">
        {selectedTags.length === 0 ? (
          <p className="meta">No taste tags yet.</p>
        ) : (
          selectedTags.map((tag) => (
            <button
              key={tag}
              className="tag-chip"
              type="button"
              onClick={() => removeTag(tag)}
            >
              <span>{tasteTagLookup.get(tag)?.label ?? tag}</span>
              <span className="tag-chip__remove" aria-hidden="true">
                x
              </span>
            </button>
          ))
        )}
      </div>

      <div className="tag-input__suggestions">
        {groupedSuggestions.map((category) => (
          <div key={category.id} className="tag-suggestion-group">
            <div className="tag-suggestion-group__header">
              <strong>{category.label}</strong>
              <span className="meta">{category.description}</span>
            </div>
            <div className="tag-row">
              {category.tags.map((tag) => (
                <button
                  key={tag}
                  className="tag-chip tag-chip--suggestion"
                  type="button"
                  onClick={() => addTag(tag)}
                >
                  {tasteTagLookup.get(tag)?.label ?? tag}
                </button>
              ))}
            </div>
          </div>
        ))}

        {canCreateCustomTag ? (
          <button
            type="button"
            className="tag-chip tag-chip--custom"
            onClick={() => addTag(normalizedQuery)}
          >
            Add custom tag "{normalizedQuery}"
          </button>
        ) : null}
      </div>
    </div>
  )
}
