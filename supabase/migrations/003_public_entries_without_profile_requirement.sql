-- Let the default public diary show entries explicitly marked public.
-- Profile slugs still power /v/:user, but the root public diary should not
-- require a public profile record to show public entries.

drop policy if exists "Public can select public film entries"
on public.film_entries;

create policy "Public can select public film entries"
on public.film_entries
for select
to anon, authenticated
using (is_public = true);
