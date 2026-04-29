import { useState } from 'react'
import {
  ownedMediaOptions,
  watchContextOptions,
} from '../config/filmOptions'
import { RATING_OPTIONS } from '../config/filmTags'
import { TagInput } from './TagInput'
import type {
  CreateFilmEntryInput,
  FilmEntry,
  OwnedMediaFormat,
  WatchContext,
} from '../types/film'

type FilmFormProps = {
  isSaving: boolean
  onSubmit: (input: CreateFilmEntryInput) => Promise<boolean>
  initialValues?: FilmEntry
  submitLabel?: string
  onCancel?: () => void
}

type FilmFormState = {
  title: string
  releaseYear: string
  dateWatched: string
  rating: string
  tags: string[]
  watchContext: WatchContext | ''
  watchContextNote: string
  ownedFormats: OwnedMediaFormat[]
  onWishlist: boolean
  notes: string
}

const initialState = (film?: FilmEntry): FilmFormState => ({
  title: film?.title ?? '',
  releaseYear: film?.releaseYear ? String(film.releaseYear) : '',
  dateWatched: film?.dateWatched ?? new Date().toISOString().slice(0, 10),
  rating: film?.rating === null || film?.rating === undefined ? '' : String(film.rating),
  tags: film?.tags ?? [],
  watchContext: film?.metadata.watchContext ?? '',
  watchContextNote: film?.metadata.watchContextNote ?? '',
  ownedFormats: film?.metadata.ownedFormats ?? [],
  onWishlist: film?.metadata.onWishlist ?? false,
  notes: film?.notes ?? '',
})

export function FilmForm({ isSaving, onSubmit, initialValues, submitLabel = 'Add film', onCancel }: FilmFormProps) {
  const [form, setForm] = useState<FilmFormState>(() => initialState(initialValues))

  const handleChange =
    (field: keyof FilmFormState) =>
    (
      event: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) => {
      const { value } = event.target
      setForm((current) => ({ ...current, [field]: value }))
    }

  const toggleOwnedFormat = (format: OwnedMediaFormat) => {
    setForm((current) => ({
      ...current,
      ownedFormats: current.ownedFormats.includes(format)
        ? current.ownedFormats.filter((value) => value !== format)
        : [...current.ownedFormats, format],
    }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const saved = await onSubmit({
      title: form.title,
      releaseYear: form.releaseYear ? Number(form.releaseYear) : null,
      dateWatched: form.dateWatched,
      rating: form.rating ? Number(form.rating) : null,
      tags: form.tags,
      metadata: {
        watchContext: form.watchContext,
        watchContextNote: form.watchContextNote,
        ownedFormats: form.ownedFormats,
        onWishlist: form.onWishlist,
      },
      notes: form.notes,
    })

    if (saved) {
      setForm(initialState())
    }
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="title">Film title</label>
        <input
          id="title"
          name="title"
          value={form.title}
          onChange={handleChange('title')}
          placeholder="In the Mood for Love"
          autoComplete="off"
          required
        />
      </div>

      <div className="form-grid__row">
        <div className="field">
          <label htmlFor="releaseYear">Release year</label>
          <input
            id="releaseYear"
            name="releaseYear"
            type="number"
            min="1888"
            max="2100"
            step="1"
            inputMode="numeric"
            value={form.releaseYear}
            onChange={handleChange('releaseYear')}
            placeholder="2000"
          />
        </div>

        <div className="field">
          <label htmlFor="dateWatched">Date watched</label>
          <input
            id="dateWatched"
            name="dateWatched"
            type="date"
            value={form.dateWatched}
            onChange={handleChange('dateWatched')}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="rating">Rating</label>
          <select
            id="rating"
            name="rating"
            value={form.rating}
            onChange={handleChange('rating')}
          >
            <option value="">Unrated</option>
            {RATING_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} - {option.description}
              </option>
            ))}
          </select>
        </div>
      </div>

      <TagInput
        selectedTags={form.tags}
        onChange={(tags) => setForm((current) => ({ ...current, tags }))}
      />

      <div className="field">
        <label htmlFor="watchContext">Watch context</label>
        <select
          id="watchContext"
          name="watchContext"
          value={form.watchContext}
          onChange={handleChange('watchContext')}
        >
          <option value="">Choose a context</option>
          {watchContextOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="watchContextNote">Context note</label>
        <input
          id="watchContextNote"
          name="watchContextNote"
          value={form.watchContextNote}
          onChange={handleChange('watchContextNote')}
          placeholder="Optional note about the setup or screening"
        />
      </div>

      <div className="field">
        <label>Collection details</label>
        <div className="check-grid">
          {ownedMediaOptions.map((option) => (
            <label key={option.value} className="check-pill">
              <input
                type="checkbox"
                checked={form.ownedFormats.includes(option.value)}
                onChange={() => toggleOwnedFormat(option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
          <label className="check-pill check-pill--accent">
            <input
              type="checkbox"
              checked={form.onWishlist}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  onWishlist: event.target.checked,
                }))
              }
            />
            <span>Keep on wishlist</span>
          </label>
        </div>
      </div>

      <div className="field">
        <label htmlFor="notes">Notes</label>
        <textarea
          id="notes"
          name="notes"
          value={form.notes}
          onChange={handleChange('notes')}
          placeholder="A few lines about what landed, what dragged, or what you want to remember."
        />
      </div>

      <div className="button-row">
        <button className="button-primary" type="submit" disabled={isSaving}>
          {isSaving ? 'Saving...' : submitLabel}
        </button>
        {onCancel ? (
          <button className="button-secondary" type="button" onClick={onCancel}>
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  )
}
