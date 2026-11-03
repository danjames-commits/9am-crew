-- Migration 033: coaches can add someone to a class who forgot to check in, or take one off.
create or replace function public.coach_set_attendance(d date, uid uuid, going boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_coach() then raise exception 'Coaches only'; end if;
  if not exists (select 1 from public.profiles where id = uid and approved) then raise exception 'Not a member'; end if;
  if going then
    insert into public.attendance (class_date, user_id) values (d, uid) on conflict do nothing;
  else
    delete from public.attendance where class_date = d and user_id = uid;
  end if;
end $$;
revoke all on function public.coach_set_attendance(date, uuid, boolean) from public, anon;
grant execute on function public.coach_set_attendance(date, uuid, boolean) to authenticated;
