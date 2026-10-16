-- Lets members log a lift without remembering the date.
-- Those lifts count toward their numbers but are never announced as a new best.
alter table public.lift_logs alter column logged_on drop not null;

create or replace function public.mark_personal_best()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.is_pr :=
    new.logged_on is not null
    and exists (
      select 1 from public.lift_logs
       where user_id = new.user_id and movement_id = new.movement_id
    )
    and not exists (
      select 1 from public.lift_logs
       where user_id = new.user_id
         and movement_id = new.movement_id
         and weight >= new.weight
         and reps >= new.reps
    );
  return new;
end;
$$;
