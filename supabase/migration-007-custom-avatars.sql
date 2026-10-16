-- Custom spirit animals drawn by Claude ("a grumpy beaver"). Each member has at most one.
create table if not exists public.avatars (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  prompt text not null check (char_length(prompt) between 1 and 120),
  name text not null check (char_length(name) between 1 and 60),
  svg text not null check (char_length(svg) <= 20000 and svg like '<svg%' and svg not ilike '%<script%' and svg not ilike '%foreignobject%'),
  updated_at timestamptz not null default now()
);
alter table public.avatars enable row level security;
grant select, insert, update, delete on public.avatars to authenticated;
drop policy if exists "read avatars" on public.avatars;
create policy "read avatars" on public.avatars for select to authenticated using (public.is_approved());
drop policy if exists "add own avatar" on public.avatars;
create policy "add own avatar" on public.avatars for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "edit own avatar" on public.avatars;
create policy "edit own avatar" on public.avatars for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "remove own avatar" on public.avatars;
create policy "remove own avatar" on public.avatars for delete to authenticated using (user_id = auth.uid());

-- profiles.animal is now a preset id, or 'custom:<version>' when using the drawn one.
alter table public.profiles drop constraint if exists profiles_animal_check;
alter table public.profiles add constraint profiles_animal_check check (
  animal is null or animal ~ '^custom:[a-z0-9]{1,16}$' or animal in (
    'raccoon', 'beaver', 'deer', 'otter', 'sloth', 'hedgehog', 'turtle', 'duck', 'goose', 'koala', 'badger',
    'skunk', 'llama', 'goat', 'owl', 'penguin', 'seal', 'moose', 'chipmunk', 'snail', 'lobster', 'crab'
  )
);

-- Claude drawing counts toward a daily limit like the other Claude features.
alter table public.ai_requests drop constraint if exists ai_requests_kind_check;
alter table public.ai_requests add constraint ai_requests_kind_check check (kind in ('build', 'scale', 'recap', 'plan', 'avatar'));
