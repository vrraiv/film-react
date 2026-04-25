import { useState } from 'react'
import {
  ownedMediaOptions,
  watchContextOptions,
} from '../config/filmOptions'
import { TagInput } from './TagInput'
import type { CreateFilmEntryInput, OwnedMediaFormat, WatchContext } from '../types/film'

type FilmFormProps = {
  isSaving: boolean
  onSubmit: (input: CreateFilmEntryInput) => Promise<boolean>
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

const initialState = (): FilmFormState => ({
  title: '',
  releaseYear: '',
  dateWatched: new Date().toISOString().slice(0, 10),
  rating: '',
  tags: [],
  watchContext: '',
  watchContextNote: '',
  ownedFormats: [],
  onWishlist: false,
  notes: '',
})

export function FilmForm({ isSaving, onSubmit }: FilmFormProps) {
  const [form, setForm] = useState<FilmFormState>(initialState)

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
      rating: Number(form.rating),
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
          <input
            id="rating"
            name="rating"
            type="number"
            min="0"
            max="5"
            step="0.5"
            value={form.rating}
            onChange={handleChange('rating')}
            placeholder="4.5"
            required
          />
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

      <button className="button-primary" type="submit" disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Add film'}
      </button>
    </form>
  )
}
