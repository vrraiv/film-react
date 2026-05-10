-- Clear over-broad firstWatch=true values for singleton Letterboxd rows.
-- A singleton log proves the film has only one diary entry, but it does not
-- prove it was the user's first lifetime watch.
--
-- Keep singleton firstWatch=true values that are still supported by the TMDb
-- release-date rule: watched before the official release date, or within one
-- year after it. Migration 012 backfills unset singleton rows that satisfy
-- the same release-date rule.

begin;

with letterboxd_groups as (
  select
    user_id,
    lower(btrim(title)) as normalized_title,
    release_year,
    count(*) as entry_count
  from public.film_entries
  where metadata->>'source' = 'letterboxd'
  group by user_id, lower(btrim(title)), release_year
),
singleton_candidates as (
  select
    film.id,
    film.date_watched,
    case
      when film.metadata#>>'{tmdb,releaseDate}' ~ '^\d{4}-\d{2}-\d{2}$'
        then (film.metadata#>>'{tmdb,releaseDate}')::date
      else null
    end as release_date
  from public.film_entries film
  inner join letterboxd_groups grp
    on grp.user_id = film.user_id
   and grp.normalized_title = lower(btrim(film.title))
   and grp.release_year is not distinct from film.release_year
  where film.metadata->>'source' = 'letterboxd'
    and grp.entry_count = 1
    and (film.metadata->>'firstWatch')::boolean is true
),
overinferred_singletons as (
  select id
  from singleton_candidates
  where release_date is null
     or date_watched is null
     or date_watched - release_date > 365
)
update public.film_entries as film
set metadata = jsonb_set(film.metadata, '{firstWatch}', 'null'::jsonb, true)
from overinferred_singletons singleton
where film.id = singleton.id;

commit;
