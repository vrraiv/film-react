-- Subject / Theme tag revision migration
-- Preserves existing movie/tag metadata by migrating legacy subject tag IDs to new IDs.

update public.film_entries
set tags = array(
  select distinct case tag
    when 'marriage' then 'relationships'
    when 'art_artists' then 'art_creation'
    when 'technology' then 'science_technology'
    when 'nature' then 'nature_environment'
    when 'environment' then 'nature_environment'
    else tag
  end
  from unnest(tags) as tag
)
where tags && array['marriage', 'art_artists', 'technology', 'nature', 'environment'];

update public.tag_metadata
set tag_id = case tag_id
  when 'marriage' then 'relationships'
  when 'art_artists' then 'art_creation'
  when 'technology' then 'science_technology'
  when 'nature' then 'nature_environment'
  when 'environment' then 'nature_environment'
  else tag_id
end
where tag_id in ('marriage', 'art_artists', 'technology', 'nature', 'environment')
on conflict (user_id, tag_id)
do update set
  role = excluded.role,
  override = excluded.override,
  notes = coalesce(excluded.notes, public.tag_metadata.notes),
  updated_at = now();
