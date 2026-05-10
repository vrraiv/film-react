-- Add a first-class release_date column for SQL comparisons.
-- The React app still keeps TMDb metadata in metadata.tmdb, but a date column
-- lets backfills compare release dates to date_watched without parsing JSON.

begin;

alter table public.film_entries
  add column if not exists release_date date;

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

update public.film_entries
set release_date = public.get_film_entry_metadata_release_date(metadata)
where release_date is null
  and public.get_film_entry_metadata_release_date(metadata) is not null;

create or replace function public.set_film_entry_release_date()
returns trigger
language plpgsql
as $$
begin
  new.release_date := public.get_film_entry_metadata_release_date(new.metadata);
  return new;
end;
$$;

drop trigger if exists film_entries_set_release_date on public.film_entries;

create trigger film_entries_set_release_date
before insert or update of metadata on public.film_entries
for each row
execute function public.set_film_entry_release_date();

create index if not exists film_entries_release_date_idx
  on public.film_entries (release_date)
  where release_date is not null;

commit;
