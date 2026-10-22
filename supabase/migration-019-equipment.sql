-- Migration 019: coaches can adjust a workout's equipment list.
-- The app reads the kit from the workout text; these are a coach's changes on top.
alter table public.workouts add column if not exists equipment_add text[] not null default '{}';
alter table public.workouts add column if not exists equipment_remove text[] not null default '{}';
