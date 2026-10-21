-- Migration 018: little animated drawings for personal bests.
-- One per person per lift: their spirit animal doing that lift, drawn by Claude
-- the first time they hit a best on it, then reused.
create table if not exists public.pr_art (
  user_id uuid not null references public.profiles (id) on delete cascade,
  movement_id int not null references public.movements (id) on delete cascade,
  -- The spirit animal it was drawn from; a new animal means a new drawing.
  animal text,
  status text not null default 'drawing' check (status in ('drawing', 'ready', 'failed')),
  svg text check (svg is null or (char_length(svg) <= 24000 and svg !~* '<script|<foreignobject|href')),
  updated_at timestamptz not null default now(),
  primary key (user_id, movement_id)
);
alter table public.pr_art enable row level security;

drop policy if exists "read pr art" on public.pr_art;
create policy "read pr art" on public.pr_art for select to authenticated using ((select public.is_approved()));
drop policy if exists "add pr art" on public.pr_art;
create policy "add pr art" on public.pr_art for insert to authenticated
  with check ((user_id = (select auth.uid()) and (select public.is_approved())) or (select public.is_admin()));
drop policy if exists "redraw pr art" on public.pr_art;
create policy "redraw pr art" on public.pr_art for update to authenticated
  using ((user_id = (select auth.uid()) and (select public.is_approved())) or (select public.is_admin()))
  with check ((user_id = (select auth.uid()) and (select public.is_approved())) or (select public.is_admin()));
drop policy if exists "remove pr art" on public.pr_art;
create policy "remove pr art" on public.pr_art for delete to authenticated using ((select public.is_admin()));

-- Supabase no longer grants API access to new tables by itself (from Oct 30, 2026).
grant select, insert, update, delete on public.pr_art to authenticated;
revoke all on public.pr_art from anon;

-- Claude requests for these count toward a daily limit like the others.
alter table public.ai_requests drop constraint if exists ai_requests_kind_check;
alter table public.ai_requests add constraint ai_requests_kind_check check (kind in ('build', 'scale', 'recap', 'plan', 'avatar', 'prart'));
