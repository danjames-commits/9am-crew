-- Migration 017: the coaches' brief that every Claude feature reads.
-- Empty means the app's starting version (in src/lib/coach-brief.ts).
-- Lives on the existing one-row program table, which approved members can read
-- and admins can edit, so no new grants are needed.
alter table public.program add column if not exists coach_brief text check (char_length(coach_brief) <= 6000);
alter table public.program add column if not exists coach_brief_at timestamptz;
alter table public.program add column if not exists coach_brief_by uuid references public.profiles (id) on delete set null;
