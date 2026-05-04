-- Tone / Mood tag revision migration
-- Replaces deprecated IDs and removes retired tags from stored data.

update public.film_entries
set tags = array(
  select distinct mapped_tag
  from (
    select case tag
      when 'tense' then 'suspenseful'
      when 'deadpan' then null
      when 'austere' then null
      else tag
    end as mapped_tag
    from unnest(tags) as tag
  ) remapped
  where mapped_tag is not null
)
where tags && array['tense', 'deadpan', 'austere'];

insert into public.tag_metadata (
  user_id,
  tag_id,
  role,
  override,
  notes,
  created_at,
  updated_at
)
select
  user_id,
  'suspenseful' as tag_id,
  role,
  override,
  notes,
  created_at,
  now()
from public.tag_metadata
where tag_id = 'tense'
on conflict (user_id, tag_id)
do update set
  role = excluded.role,
  override = excluded.override,
  notes = coalesce(excluded.notes, public.tag_metadata.notes),
  updated_at = now();

delete from public.tag_metadata
where tag_id in ('tense', 'deadpan', 'austere');
