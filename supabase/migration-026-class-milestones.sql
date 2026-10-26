-- Migration 026: celebrate class milestones (10, 25, 50, 75, 100, then every 50 to 500,
-- then every 100). After class on weekdays, anyone who crossed one gets a celebration
-- in the chat, unless they've opted out of Show-ups. Milestones already passed are
-- marked as celebrated quietly, so nobody gets a pile of old ones at once.

alter table public.profiles add column if not exists classes_celebrated int not null default 0;

alter table public.messages drop constraint if exists messages_kind_check;
alter table public.messages add constraint messages_kind_check check (kind in ('text', 'pr', 'recap', 'milestone'));

-- The biggest milestone at or under n.
create or replace function public.class_milestone(n int)
returns int language sql immutable as $$
  select case
    when n >= 500 then (n / 100) * 100
    when n >= 100 then (n / 50) * 50
    when n >= 75 then 75
    when n >= 50 then 50
    when n >= 25 then 25
    when n >= 10 then 10
    else 0 end;
$$;

-- Classes someone has been to: published workouts they were in, once the class is over (10 AM).
create or replace function public.classes_attended(uid uuid)
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int
  from public.attendance a
  join public.workouts w on w.class_date = a.class_date and w.status = 'published'
  where a.user_id = uid
    and (a.class_date < (now() at time zone 'America/Halifax')::date
      or (a.class_date = (now() at time zone 'America/Halifax')::date
          and extract(hour from now() at time zone 'America/Halifax') >= 10));
$$;
revoke all on function public.classes_attended(uuid) from public, anon;
grant execute on function public.classes_attended(uuid) to authenticated;

create or replace function public.celebrate_class_milestones()
returns void language plpgsql security definer set search_path = public as $$
declare
  p record;
  m int;
begin
  for p in select id, classes_celebrated, show_in_showups from public.profiles where approved loop
    m := public.class_milestone(public.classes_attended(p.id));
    if m > p.classes_celebrated then
      update public.profiles set classes_celebrated = m where id = p.id;
      if coalesce(p.show_in_showups, true) then
        insert into public.messages (user_id, body, kind) values (p.id, m || ' classes', 'milestone');
      end if;
    end if;
  end loop;
end $$;
revoke all on function public.celebrate_class_milestones() from public, anon, authenticated;

-- Quietly mark what everyone has already passed.
update public.profiles set classes_celebrated = public.class_milestone(public.classes_attended(id)) where approved;

-- 10:20 and 11:20 Halifax in summer time (9:20 and 10:20 in winter): after class either way.
select cron.unschedule('class-milestones') where exists (select 1 from cron.job where jobname = 'class-milestones');
select cron.schedule('class-milestones', '20 13,14 * * 1-5', $$ select public.celebrate_class_milestones(); $$);
