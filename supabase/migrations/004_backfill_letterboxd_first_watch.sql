-- Backfill firstWatch for Letterboxd-imported rows.
-- Rule:
--   * For each user + (title, release_year) group among Letterboxd rows,
--     skip groups that already have any metadata.firstWatch=true entry.
--   * For remaining groups, mark the earliest watched entry as firstWatch=true.
--   * Mark all later watched entries in those groups as firstWatch=false.
-- Notes:
--   * Uses id as a deterministic tiebreaker when multiple rows share date_watched.
--   * Restricts updates to rows where metadata.source = 'letterboxd'.

begin;

with letterboxd_rows as (
  select
    id,
    user_id,
    lower(btrim(title)) as normalized_title,
    release_year,
    date_watched,
    metadata
  from public.film_entries
  where metadata->>'source' = 'letterboxd'
),
eligible_groups as (
  select
    user_id,
    normalized_title,
    release_year
  from letterboxd_rows
  group by user_id, normalized_title, release_year
  having not bool_or(coalesce((metadata->>'firstWatch')::boolean, false))
),
ranked as (
  select
    row.id,
    row_number() over (
      partition by row.user_id, row.normalized_title, row.release_year
      order by row.date_watched asc, row.id asc
    ) as watch_rank
  from letterboxd_rows row
  inner join eligible_groups grp
    on grp.user_id = row.user_id
   and grp.normalized_title = row.normalized_title
   and grp.release_year is not distinct from row.release_year
)
update public.film_entries as film
set metadata = jsonb_set(
  film.metadata,
  '{firstWatch}',
  to_jsonb(case when ranked.watch_rank = 1 then true else false end),
  true
)
from ranked
where film.id = ranked.id;

commit;
