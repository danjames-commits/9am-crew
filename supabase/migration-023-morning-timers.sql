-- Migration 023: Claude sets the gym clock timers the morning of class.
-- At about 8:15 AM Halifax time on weekdays, the database asks the app to set today's
-- timers. It's skipped when nobody has signed up, when the workout isn't published,
-- or when a coach set the timers by hand. Run again later that morning only if the
-- workout changed since. A one-time ticket proves the request came from here.

alter table public.workouts add column if not exists clock_by text check (clock_by in ('claude', 'coach'));
alter table public.workouts add column if not exists clock_for text;

create table if not exists public.cron_tickets (
  token text primary key,
  created_at timestamptz not null default now()
);
alter table public.cron_tickets enable row level security;
revoke all on public.cron_tickets from anon, authenticated;

-- Called by the schedule: makes a ticket and pings the app with it.
create or replace function public.clock_job_kick()
returns void language plpgsql security definer set search_path = public, extensions as $$
declare t text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
begin
  delete from public.cron_tickets where created_at < now() - interval '1 hour';
  insert into public.cron_tickets (token) values (t);
  perform net.http_get('https://9amcrew.ca/api/clock-job?ticket=' || t);
end $$;
revoke all on function public.clock_job_kick() from public, anon, authenticated;

create or replace function public.clock_job_ticket_ok(ticket text)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.cron_tickets where token = ticket and created_at > now() - interval '10 minutes');
$$;
revoke all on function public.clock_job_ticket_ok(text) from public, anon, authenticated;

-- What the app needs to set today's timers, or null if there's nothing to do.
create or replace function public.clock_job_class(ticket text)
returns jsonb language plpgsql security definer stable set search_path = public as $$
declare
  d date := (now() at time zone 'America/Halifax')::date;
  w record;
begin
  if not public.clock_job_ticket_ok(ticket) then return null; end if;
  if extract(isodow from d) > 5 then return null; end if;
  select class_date, parts, clock_plan, clock_by, clock_for into w
    from public.workouts where class_date = d and status = 'published';
  if not found or w.clock_by = 'coach' then return null; end if;
  if not exists (select 1 from public.attendance where class_date = d) then return null; end if;
  return jsonb_build_object(
    'date', w.class_date, 'parts', w.parts, 'has_plan', w.clock_plan is not null, 'clock_for', w.clock_for,
    'brief', (select coach_brief from public.program where id = 1)
  );
end $$;
grant execute on function public.clock_job_class(text) to anon;

-- Saves Claude's timers (never over a coach's) and uses up the ticket.
create or replace function public.clock_job_save(ticket text, d date, plan jsonb, fp text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not public.clock_job_ticket_ok(ticket) then return false; end if;
  delete from public.cron_tickets where token = ticket;
  update public.workouts set clock_plan = plan, clock_by = 'claude', clock_for = fp
    where class_date = d and coalesce(clock_by, '') <> 'coach';
  return true;
end $$;
grant execute on function public.clock_job_save(text, date, jsonb, text) to anon;

-- 11:15 and 12:15 UTC: 8:15 AM Halifax in summer time, 7:15 and 8:15 in winter.
select cron.unschedule('class-timers') where exists (select 1 from cron.job where jobname = 'class-timers');
select cron.schedule('class-timers', '15 11,12 * * 1-5', $$ select public.clock_job_kick(); $$);
