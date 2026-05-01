-- Public read-only sharing for selected diary entries.
-- Public visitors can read only public profiles and only entries explicitly
-- marked public by that profile owner.

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
    nullif(
      coalesce(
        new.raw_user_meta_data->>'name',
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'user_name'
      ),
      ''
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

update public.profiles as profile
set display_name = null
from auth.users as auth_user
where profile.id = auth_user.id
  and profile.display_name = auth_user.email;

create index if not exists profiles_public_username_idx
  on public.profiles (username)
  where is_public = true and username is not null;

create index if not exists film_entries_public_user_date_idx
  on public.film_entries (user_id, date_watched desc)
  where is_public = true;

create policy "Public can select public profiles"
on public.profiles
for select
to anon, authenticated
using (
  is_public = true
  and username is not null
);

create policy "Public can select public film entries"
on public.film_entries
for select
to anon, authenticated
using (
  is_public = true
  and exists (
    select 1
    from public.profiles
    where profiles.id = film_entries.user_id
      and profiles.is_public = true
      and profiles.username is not null
  )
);
