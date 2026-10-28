-- Migration 032: a log of every clock send (which buttons, how long SwitchBot took to
-- accept each, and any error), so a timer that doesn't show up can be traced.
create table if not exists public.clock_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  user_id uuid default auth.uid(),
  source text not null,
  presses jsonb not null,
  ok boolean not null,
  error text
);
alter table public.clock_log enable row level security;
create policy clock_log_insert on public.clock_log for insert to authenticated with check (public.is_coach() and user_id = auth.uid());
create policy clock_log_select on public.clock_log for select to authenticated using (public.is_coach());
