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

update public.tag_metadata
set tag_id = case tag_id
  when 'tense' then 'suspenseful'
  else tag_id
end
where tag_id = 'tense'
on conflict (user_id, tag_id)
do update set
  role = excluded.role,
  override = excluded.override,
  notes = coalesce(excluded.notes, public.tag_metadata.notes),
  updated_at = now();

delete from public.tag_metadata
where tag_id in ('deadpan', 'austere');
