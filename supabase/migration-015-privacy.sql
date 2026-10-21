-- Migration 015: opt out of the Show-ups leaderboard and of sharing personal bests.
alter table public.profiles add column if not exists show_in_showups boolean not null default true;
alter table public.profiles add column if not exists share_prs boolean not null default true;
grant update (display_name, level, animal, weekly_goal, show_in_showups, share_prs) on public.profiles to authenticated;

-- A personal best still counts on your own lifts; it's only posted to the crew if you share them.
create or replace function public.announce_personal_best()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  movement_name text;
begin
  if new.is_pr and coalesce((select share_prs from public.profiles where id = new.user_id), true) then
    select name into movement_name from public.movements where id = new.movement_id;
    insert into public.messages (user_id, body, kind, lift_log_id)
    values (
      new.user_id,
      movement_name || ' · '
        || case when new.weight = trunc(new.weight) then trunc(new.weight)::int::text else new.weight::text end
        || ' lb'
        || case when new.reps > 1 then ' × ' || new.reps else '' end,
      'pr',
      new.id
    );
  end if;
  return new;
end;
$$;
