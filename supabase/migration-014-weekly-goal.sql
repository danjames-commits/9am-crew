-- Migration 014: a personal weekly attendance goal (1 to 5 classes a week).
-- Starts at 1, so "weeks you showed up" until someone sets a higher goal.
alter table public.profiles add column if not exists weekly_goal smallint not null default 1
  check (weekly_goal between 1 and 5);
grant update (display_name, level, animal, weekly_goal) on public.profiles to authenticated;
