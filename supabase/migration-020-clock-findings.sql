-- Migration 020: what the coaches found when testing the gym clock's remote
-- (the "Try it" panel on Program → Clock). Lives on the one-row program table.
alter table public.program add column if not exists clock_findings jsonb not null default '{}'::jsonb;
