-- Claude features: the Friday recap in chat, and a usage log for daily limits.

-- Recap messages have no author (they come from the app).
alter table public.messages alter column user_id drop not null;
alter table public.messages drop constraint if exists messages_kind_check;
alter table public.messages add constraint messages_kind_check check (kind in ('text', 'pr', 'recap'));

-- One recap per week, whoever's visit triggers it first.
create table if not exists public.weekly_recaps (
  week_start date primary key,
  message_id bigint references public.messages (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.weekly_recaps enable row level security;
drop policy if exists "read recaps" on public.weekly_recaps;
create policy "read recaps" on public.weekly_recaps for select to authenticated using (public.is_approved());

create or replace function public.post_weekly_recap(p_week date, p_body text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  mid bigint;
begin
  if not public.is_approved() then
    raise exception 'Not allowed';
  end if;
  if extract(isodow from p_week) <> 1 then
    raise exception 'Week must start on a Monday';
  end if;
  insert into public.weekly_recaps (week_start) values (p_week) on conflict do nothing;
  if not found then
    return false;
  end if;
  insert into public.messages (user_id, body, kind) values (null, left(p_body, 2000), 'recap') returning id into mid;
  update public.weekly_recaps set message_id = mid where week_start = p_week;
  return true;
end;
$$;

-- Who asked Claude for what, so each person has a sensible daily limit.
create table if not exists public.ai_requests (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('build', 'scale', 'recap')),
  created_at timestamptz not null default now()
);
create index if not exists ai_requests_user_idx on public.ai_requests (user_id, created_at desc);
alter table public.ai_requests enable row level security;
drop policy if exists "log own ai use" on public.ai_requests;
create policy "log own ai use" on public.ai_requests for insert to authenticated
  with check (user_id = auth.uid() and public.is_approved());
drop policy if exists "see own ai use" on public.ai_requests;
create policy "see own ai use" on public.ai_requests for select to authenticated using (user_id = auth.uid());
