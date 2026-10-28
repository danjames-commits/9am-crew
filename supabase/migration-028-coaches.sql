-- Migration 028: coaches. A coach runs class: coach mode with the coach notes and every
-- level, and the gym clock (start timers, change a part's timers, the manual remote).
-- They can't edit workouts, the program or members; that stays with admins.
alter table public.profiles add column if not exists is_coach boolean not null default false;

-- Coaches and admins (admins can do everything a coach can).
create or replace function public.is_coach()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select approved and (is_coach or is_admin) from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.admin_set_coach(member uuid, on_off boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Only admins can change coaches'; end if;
  update public.profiles set is_coach = on_off and approved where id = member;
end $$;

drop policy if exists "admins read coach notes" on public.workout_coach_notes;
drop policy if exists "coaches read coach notes" on public.workout_coach_notes;
create policy "coaches read coach notes" on public.workout_coach_notes for select to authenticated using ((select public.is_coach()));

-- Coaches change a day's clock timers (only the timers, nothing else on the workout).
create or replace function public.set_clock_plan(d date, plan jsonb, by_who text, fp text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not public.is_coach() then raise exception 'Only coaches can change the timers'; end if;
  if by_who not in ('claude', 'coach') then raise exception 'Bad source'; end if;
  update public.workouts set clock_plan = plan, clock_by = by_who, clock_for = coalesce(fp, clock_for) where class_date = d;
  return found;
end $$;
revoke all on function public.set_clock_plan(date, jsonb, text, text) from public, anon;
grant execute on function public.set_clock_plan(date, jsonb, text, text) to authenticated;
revoke all on function public.admin_set_coach(uuid, boolean) from public, anon;
grant execute on function public.admin_set_coach(uuid, boolean) to authenticated;
