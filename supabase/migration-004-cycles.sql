-- Planned cycles. Each one replaces the built-in pattern for its weeks.
-- The app works out which cycle covers a date; with none planned it uses the
-- built-in pattern from the Program settings.

create table if not exists public.cycles (
  id bigint generated always as identity primary key,
  start_date date not null,
  week_count smallint not null check (week_count between 3 and 12),
  end_date date generated always as (start_date + (week_count * 7)) stored,
  name text not null default '' check (char_length(name) <= 80),
  why text not null default '' check (char_length(why) <= 1500),
  brief text not null default '' check (char_length(brief) <= 1500),
  goals text[] not null default '{}',
  weeks jsonb not null,
  days jsonb not null,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  updated_at timestamptz not null default now(),
  constraint cycles_start_monday check (extract(isodow from start_date) = 1),
  constraint cycles_weeks_match check (jsonb_typeof(weeks) = 'array' and jsonb_array_length(weeks) = week_count),
  constraint cycles_no_overlap exclude using gist (daterange(start_date, end_date) with &&)
);

alter table public.cycles enable row level security;

drop policy if exists "read cycles" on public.cycles;
create policy "read cycles" on public.cycles for select to authenticated using (public.is_approved());
drop policy if exists "admins add cycles" on public.cycles;
create policy "admins add cycles" on public.cycles for insert to authenticated with check (public.is_admin());
drop policy if exists "admins edit cycles" on public.cycles;
create policy "admins edit cycles" on public.cycles for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins delete cycles" on public.cycles;
create policy "admins delete cycles" on public.cycles for delete to authenticated using (public.is_admin());

-- Planning a cycle with Claude counts toward the daily limit too.
alter table public.ai_requests drop constraint if exists ai_requests_kind_check;
alter table public.ai_requests add constraint ai_requests_kind_check check (kind in ('build', 'scale', 'recap', 'plan'));
