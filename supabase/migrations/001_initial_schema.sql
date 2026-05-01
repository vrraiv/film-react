-- Initial production schema for the film diary MVP.
-- Mirrors the current localStorage FilmEntry shape:
-- title, release year, watched date, rating, tags, notes, public flag, and metadata.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  username text unique,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (
    username is null
    or username ~ '^[a-z0-9_]{3,32}$'
  )
);

create table public.film_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  release_year integer,
  date_watched date not null,
  rating numeric(2, 1),
  tags text[] not null default '{}',
  notes text not null default '',
  is_public boolean not null default false,
  metadata jsonb not null default jsonb_build_object(
    'dateLogged', '',
    'firstWatch', null,
    'watchContext', '',
    'watchContextNote', '',
    'ownedFormats', jsonb_build_array(),
    'onWishlist', false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint film_entries_title_not_blank check (length(btrim(title)) > 0),
  constraint film_entries_release_year_range check (
    release_year is null
    or release_year between 1888 and 2100
  ),
  constraint film_entries_rating_range check (
    rating is null
    or (
      rating between 0.5 and 5.0
      and rating * 2 = floor(rating * 2)
    )
  ),
  constraint film_entries_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index film_entries_user_date_idx
  on public.film_entries (user_id, date_watched desc);

create index film_entries_user_created_idx
  on public.film_entries (user_id, created_at desc);

create index film_entries_user_tags_idx
  on public.film_entries using gin (tags);

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create trigger film_entries_set_updated_at
before update on public.film_entries
for each row
execute function public.set_updated_at();

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(coalesce(new.raw_user_meta_data->>'name', new.email), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.create_profile_for_new_user();

alter table public.profiles enable row level security;
alter table public.film_entries enable row level security;

create policy "Users can select their own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "Users can insert their own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Users can delete their own profile"
on public.profiles
for delete
to authenticated
using (auth.uid() = id);

create policy "Users can select their own film entries"
on public.film_entries
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own film entries"
on public.film_entries
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own film entries"
on public.film_entries
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own film entries"
on public.film_entries
for delete
to authenticated
using (auth.uid() = user_id);
