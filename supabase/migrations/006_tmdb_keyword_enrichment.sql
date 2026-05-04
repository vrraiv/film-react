-- Add a dedicated metadata field for sourced keywords used by recommender prep.
-- Keeps TMDb keywords separate from manual tags.

update public.film_entries
set metadata = jsonb_set(metadata, '{keywords}', '[]'::jsonb, true)
where not (metadata ? 'keywords');

alter table public.film_entries
alter column metadata set default jsonb_build_object(
  'dateLogged', '',
  'firstWatch', null,
  'watchContext', '',
  'watchContextNote', '',
  'ownedFormats', jsonb_build_array(),
  'onWishlist', false,
  'keywords', jsonb_build_array()
);
