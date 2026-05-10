-- Backfill Letterboxd firstWatch=true from release_date.
-- Rule:
--   * Restrict to Letterboxd-imported rows where metadata.firstWatch is unset.
--   * Require a dated diary entry and a valid release_date.
--   * Mark entries watched before the release date, or within 365 days after it,
--     as firstWatch=true.
--   * Leave older watches unset instead of marking them as rewatches.
-- Notes:
--   * Migration 004 handles repeated title/year groups.
--   * Migration 010 clears unsupported singleton true values.

begin;

with release_window_matches as (
  select id
  from public.film_entries
  where metadata->>'source' = 'letterboxd'
    and (metadata->>'firstWatch') is null
    and date_watched is not null
    and release_date is not null
    and date_watched - release_date <= 365
)
update public.film_entries as film
set metadata = jsonb_set(film.metadata, '{firstWatch}', 'true'::jsonb, true)
from release_window_matches candidate
where film.id = candidate.id;

commit;
