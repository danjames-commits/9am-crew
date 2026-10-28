-- Migration 030: a quick survey after class for people who signed up: how hard, how long,
-- and an optional note about movements. Saved only; nothing uses it yet. A skip is saved too,
-- so the survey doesn't keep popping up.
create table if not exists public.workout_surveys (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  class_date date not null,
  hard smallint check (hard between 1 and 3),     -- 1 too easy, 2 just right, 3 too hard
  length smallint check (length between 1 and 3), -- 1 too short, 2 about right, 3 too long
  note text check (char_length(note) <= 300),
  level smallint check (level between 1 and 4),
  skipped boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, class_date)
);
alter table public.workout_surveys enable row level security;
grant select, insert on public.workout_surveys to authenticated;
create policy "own surveys" on public.workout_surveys for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "answer survey" on public.workout_surveys for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.is_approved()));
