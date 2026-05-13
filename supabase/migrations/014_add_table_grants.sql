-- 014_add_table_grants.sql
-- Make Data API access explicit ahead of Supabase's public-schema default change.
-- Rollout: new projects 2026-05-30; all existing projects 2026-10-30.
-- After the cutoff, tables in public are not auto-exposed to PostgREST / GraphQL /
-- supabase-js, and missing access returns SQLSTATE 42501. GRANT is idempotent, so
-- re-running this migration is safe.

-- profiles: anon reads public profiles; authenticated owners CRUD their own row.
grant select
  on public.profiles
  to anon;

grant select, insert, update, delete
  on public.profiles
  to authenticated;

grant all
  on public.profiles
  to service_role;

-- film_entries: anon reads is_public = true rows; authenticated owners CRUD their own rows.
grant select
  on public.film_entries
  to anon;

grant select, insert, update, delete
  on public.film_entries
  to authenticated;

grant all
  on public.film_entries
  to service_role;

-- tag_metadata: owner-only; no public read policy, so no anon grant.
grant select, insert, update, delete
  on public.tag_metadata
  to authenticated;

grant all
  on public.tag_metadata
  to service_role;
