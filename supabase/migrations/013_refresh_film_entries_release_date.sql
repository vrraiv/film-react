-- Refresh release_date from known metadata shapes and reapply the first-watch
-- release-window backfill.
-- Use this after 011 if release_date exists but remained null because existing
-- rows used a different JSON key or the first run happened before TMDb metadata
-- was populated.

begin;

create or replace function public.get_film_entry_metadata_release_date(entry_metadata jsonb)
returns date
language sql
immutable
as $$
  with release_date_values as (
    select value
    from (
      values
        (entry_metadata#>>'{tmdb,releaseDate}'),
        (entry_metadata#>>'{tmdb,release_date}'),
        (entry_metadata#>>'{tmdbMetadata,releaseDate}'),
        (entry_metadata#>>'{tmdbMetadata,release_date}'),
        (entry_metadata#>>'{tmdb_metadata,releaseDate}'),
        (entry_metadata#>>'{tmdb_metadata,release_date}'),
        (entry_metadata->>'releaseDate'),
        (entry_metadata->>'release_date')
    ) as candidates(value)
    where value is not null
      and value ~ '^\d{4}-\d{2}-\d{2}$'
      and to_char(to_date(value, 'YYYY-MM-DD'), 'YYYY-MM-DD') = value
    limit 1
  )
  select to_date(value, 'YYYY-MM-DD')
  from release_date_values;
$$;

create or replace function public.set_film_entry_release_date()
returns trigger
language plpgsql
as $$
begin
  new.release_date := public.get_film_entry_metadata_release_date(new.metadata);
  return new;
end;
$$;

update public.film_entries
set release_date = public.get_film_entry_metadata_release_date(metadata)
where public.get_film_entry_metadata_release_date(metadata) is not null
  and release_date is distinct from public.get_film_entry_metadata_release_date(metadata);

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
