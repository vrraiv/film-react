create table public.tag_metadata (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  tag_id text not null,
  role text not null check (role in (
    'selection_affinity',
    'satisfaction_predictor',
    'negative_experience_signal',
    'neutral_descriptor',
    'manual_override'
  )),
  override text check (override in (
    'seek',
    'like_when_done_well',
    'neutral',
    'avoid',
    'ignore'
  )),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tag_metadata_user_tag_unique unique (user_id, tag_id)
);

create index tag_metadata_user_idx on public.tag_metadata (user_id);

create trigger tag_metadata_set_updated_at
before update on public.tag_metadata
for each row
execute function public.set_updated_at();

alter table public.tag_metadata enable row level security;

create policy "Users can select their own tag metadata"
on public.tag_metadata
for select to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own tag metadata"
on public.tag_metadata
for insert to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own tag metadata"
on public.tag_metadata
for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own tag metadata"
on public.tag_metadata
for delete to authenticated
using (auth.uid() = user_id);
