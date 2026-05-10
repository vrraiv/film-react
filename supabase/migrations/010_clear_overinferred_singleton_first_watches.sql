-- Undo the overly broad firstWatch backfill for singleton Letterboxd rows.
-- Migration 004 originally marked the only entry in each Letterboxd title/year
-- group as firstWatch=true. A singleton log proves the film has only one diary
-- entry, but it does not prove it was the user's first lifetime watch. Return
-- those over-inferred values to unset so they can be filled from explicit
-- Letterboxd rewatch data or manually reviewed later.

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
singleton_rows as (
  select film.id
  from public.film_entries film
  inner join letterboxd_groups grp
    on grp.user_id = film.user_id
   and grp.normalized_title = lower(btrim(film.title))
   and grp.release_year is not distinct from film.release_year
  where film.metadata->>'source' = 'letterboxd'
    and grp.entry_count = 1
    and (film.metadata->>'firstWatch')::boolean is true
)
update public.film_entries as film
set metadata = jsonb_set(film.metadata, '{firstWatch}', 'null'::jsonb, true)
from singleton_rows singleton
where film.id = singleton.id;

commit;
