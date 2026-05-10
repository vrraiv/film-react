-- Allow film_entries.date_watched to be NULL.
-- Letterboxd ratings.csv rows do not carry a real watched date (only a rating
-- date), so importing them without a stamp keeps insights honest. App code
-- treats NULL and empty string interchangeably via the mapper.

alter table public.film_entries
  alter column date_watched drop not null;
