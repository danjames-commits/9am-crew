-- 9AM Crew database schema
-- Paste this whole file into the Supabase SQL editor and run it once.
-- The first person to sign up becomes an approved admin automatically.

------------------------------------------------------------------
-- Members
------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 40),
  level smallint not null default 2 check (level between 1 and 4),
  is_admin boolean not null default false,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_first boolean;
begin
  select not exists (select 1 from public.profiles) into is_first;
  insert into public.profiles (id, display_name, is_admin, approved)
  values (
    new.id,
    left(coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1)), 40),
    is_first,
    is_first
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create function public.is_approved()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select approved from public.profiles where id = auth.uid()), false);
$$;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select approved and is_admin from public.profiles where id = auth.uid()), false);
$$;

-- Admins approve members and hand out admin rights through this function,
-- so nobody can promote themselves by editing their own row.
create function public.admin_set_member(member uuid, set_approved boolean, set_admin boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can change members';
  end if;
  if member = auth.uid() and (not set_admin or not set_approved) then
    raise exception 'You cannot remove your own admin rights';
  end if;
  update public.profiles
     set approved = set_approved,
         is_admin = set_admin and set_approved
   where id = member;
end;
$$;

create function public.admin_remove_member(member uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can remove members';
  end if;
  if member = auth.uid() then
    raise exception 'You cannot remove yourself';
  end if;
  delete from auth.users where id = member;
end;
$$;

------------------------------------------------------------------
-- Program settings (one row)
------------------------------------------------------------------
create table public.program (
  id smallint primary key default 1 check (id = 1),
  cycle_start date not null default current_date,
  cycle_weeks smallint not null default 6 check (cycle_weeks between 4 and 12),
  goals text[] not null default '{}',
  updated_at timestamptz not null default now()
);
insert into public.program default values;

------------------------------------------------------------------
-- Workouts, comments, check-ins
------------------------------------------------------------------
create table public.workouts (
  id bigint generated always as identity primary key,
  class_date date not null unique,
  title text not null check (char_length(title) between 1 and 80),
  focus text not null default '',
  why text not null default '',
  parts jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  updated_at timestamptz not null default now()
);

create table public.comments (
  id bigint generated always as identity primary key,
  workout_id bigint not null references public.workouts (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index comments_workout_idx on public.comments (workout_id, created_at);

create table public.attendance (
  class_date date not null,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (class_date, user_id)
);

------------------------------------------------------------------
-- Lifts and personal bests
------------------------------------------------------------------
create table public.movements (
  id int generated always as identity primary key,
  name text not null unique,
  sort int not null default 100
);
insert into public.movements (name, sort) values
  ('Back squat', 10), ('Front squat', 20), ('Deadlift', 30), ('Bench press', 40),
  ('Strict press', 50), ('Push press', 60), ('Power clean', 70), ('Goblet squat', 80),
  ('Kettlebell deadlift', 90), ('Dumbbell press', 100), ('Kettlebell swing', 110);

create table public.lift_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  movement_id int not null references public.movements (id) on delete cascade,
  weight numeric(6, 1) not null check (weight > 0 and weight < 2000),
  reps smallint not null default 1 check (reps between 1 and 20),
  logged_on date default current_date, -- null = "I don't remember when"
  is_pr boolean not null default false,
  created_at timestamptz not null default now()
);
create index lift_logs_user_idx on public.lift_logs (user_id, movement_id, logged_on desc);

------------------------------------------------------------------
-- Chat and cheers
------------------------------------------------------------------
create table public.messages (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  kind text not null default 'text' check (kind in ('text', 'pr')),
  lift_log_id bigint references public.lift_logs (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index messages_created_idx on public.messages (created_at desc);

create table public.cheers (
  lift_log_id bigint not null references public.lift_logs (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (lift_log_id, user_id)
);

-- A new log is a personal best when no earlier log of the same movement
-- was at least as heavy for at least as many reps. A person's very first
-- log of a movement is their starting point, not a celebration.
create function public.mark_personal_best()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- A lift from an unknown date is a remembered past best, not news.
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

create trigger lift_logs_mark_pr
before insert on public.lift_logs
for each row execute function public.mark_personal_best();

create function public.announce_personal_best()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  movement_name text;
begin
  if new.is_pr then
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

create trigger lift_logs_announce_pr
after insert on public.lift_logs
for each row execute function public.announce_personal_best();

------------------------------------------------------------------
-- Security rules: only approved members see anything
------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.program enable row level security;
alter table public.workouts enable row level security;
alter table public.comments enable row level security;
alter table public.attendance enable row level security;
alter table public.movements enable row level security;
alter table public.lift_logs enable row level security;
alter table public.messages enable row level security;
alter table public.cheers enable row level security;

-- Members may only change their own name and level.
revoke update on public.profiles from authenticated, anon;
grant update (display_name, level) on public.profiles to authenticated;

create policy "see crew" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_approved());
create policy "edit self" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "read program" on public.program for select to authenticated
  using (public.is_approved());
create policy "admins edit program" on public.program for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "read workouts" on public.workouts for select to authenticated
  using (public.is_approved() and (status = 'published' or public.is_admin()));
create policy "admins add workouts" on public.workouts for insert to authenticated
  with check (public.is_admin());
create policy "admins edit workouts" on public.workouts for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "admins delete workouts" on public.workouts for delete to authenticated
  using (public.is_admin());

create policy "read comments" on public.comments for select to authenticated
  using (public.is_approved());
create policy "add comments" on public.comments for insert to authenticated
  with check (user_id = auth.uid() and public.is_approved());
create policy "delete comments" on public.comments for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "read attendance" on public.attendance for select to authenticated
  using (public.is_approved());
create policy "check in" on public.attendance for insert to authenticated
  with check (user_id = auth.uid() and public.is_approved());
create policy "cancel check in" on public.attendance for delete to authenticated
  using (user_id = auth.uid());

create policy "read movements" on public.movements for select to authenticated
  using (public.is_approved());
create policy "admins add movements" on public.movements for insert to authenticated
  with check (public.is_admin());

create policy "read lifts" on public.lift_logs for select to authenticated
  using (public.is_approved());
create policy "log lifts" on public.lift_logs for insert to authenticated
  with check (user_id = auth.uid() and public.is_approved());
create policy "delete own lifts" on public.lift_logs for delete to authenticated
  using (user_id = auth.uid());

create policy "read chat" on public.messages for select to authenticated
  using (public.is_approved());
create policy "post chat" on public.messages for insert to authenticated
  with check (user_id = auth.uid() and kind = 'text' and lift_log_id is null and public.is_approved());
create policy "delete own chat" on public.messages for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "read cheers" on public.cheers for select to authenticated
  using (public.is_approved());
create policy "cheer" on public.cheers for insert to authenticated
  with check (user_id = auth.uid() and public.is_approved());
create policy "uncheer" on public.cheers for delete to authenticated
  using (user_id = auth.uid());

------------------------------------------------------------------
-- Live updates for chat
------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.messages, public.cheers;
  end if;
end;
$$;
