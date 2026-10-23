-- Migration 022: the gym clock timers for each workout (set by Claude or the coach,
-- run from coach mode), and a daily allowance for Claude drafting them.
alter table public.workouts add column if not exists clock_plan jsonb;

alter table public.ai_requests drop constraint if exists ai_requests_kind_check;
alter table public.ai_requests add constraint ai_requests_kind_check
  check (kind in ('build', 'scale', 'recap', 'plan', 'avatar', 'prart', 'clock'));
