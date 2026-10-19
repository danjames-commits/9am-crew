-- Benchmarks: timed tests and named workouts (1 km run, Cindy, Helen...) that
-- members log results for. Admins keep the list; everyone logs their own results.
-- Safe to run twice.

create table if not exists public.benchmarks (
  id int generated always as identity primary key,
  name text not null unique check (char_length(name) between 1 and 60),
  -- How it's scored: a time, rounds + reps, reps, metres, pounds or calories.
  score text not null check (score in ('time', 'rounds_reps', 'reps', 'distance', 'weight', 'calories')),
  better text not null default 'higher' check (better in ('higher', 'lower')),
  description text check (char_length(description) <= 300),
  sort int not null default 100,
  created_at timestamptz not null default now()
);

create table if not exists public.benchmark_results (
  id bigint generated always as identity primary key,
  benchmark_id int not null references public.benchmarks (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  done_on date not null default current_date,
  level smallint check (level between 1 and 4),
  time_s int check (time_s between 1 and 86400),
  rounds smallint check (rounds between 0 and 999),
  reps int check (reps between 0 and 99999),
  amount numeric(8, 1) check (amount > 0 and amount < 1000000),
  capped boolean not null default false, -- hit the time cap, so it's scored in reps
  note text check (char_length(note) <= 200),
  workout_date date,
  created_at timestamptz not null default now(),
  constraint benchmark_results_has_score check (time_s is not null or rounds is not null or reps is not null or amount is not null)
);
create index if not exists benchmark_results_user_idx on public.benchmark_results (user_id, benchmark_id, done_on desc);
create index if not exists benchmark_results_benchmark_idx on public.benchmark_results (benchmark_id);

alter table public.benchmarks enable row level security;
alter table public.benchmark_results enable row level security;
grant select, insert, update, delete on public.benchmarks to authenticated;
grant select, insert, update, delete on public.benchmark_results to authenticated;

drop policy if exists "read benchmarks" on public.benchmarks;
create policy "read benchmarks" on public.benchmarks for select to authenticated using ((select public.is_approved()));
drop policy if exists "admins add benchmarks" on public.benchmarks;
create policy "admins add benchmarks" on public.benchmarks for insert to authenticated with check ((select public.is_admin()));
drop policy if exists "admins edit benchmarks" on public.benchmarks;
create policy "admins edit benchmarks" on public.benchmarks for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "admins delete benchmarks" on public.benchmarks;
create policy "admins delete benchmarks" on public.benchmarks for delete to authenticated using ((select public.is_admin()));

drop policy if exists "read results" on public.benchmark_results;
create policy "read results" on public.benchmark_results for select to authenticated using ((select public.is_approved()));
drop policy if exists "log results" on public.benchmark_results;
create policy "log results" on public.benchmark_results for insert to authenticated with check (user_id = (select auth.uid()) and (select public.is_approved()));
drop policy if exists "edit own results" on public.benchmark_results;
create policy "edit own results" on public.benchmark_results for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "delete own results" on public.benchmark_results;
create policy "delete own results" on public.benchmark_results for delete to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));

-- The starting list: Cycle 1's tests plus a few classics.
insert into public.benchmarks (name, score, better, description, sort) values
  ('1 km run', 'time', 'lower', 'Run 1 km as fast as you can hold. Our running-pace test.', 10),
  ('1,000 m row', 'time', 'lower', 'Row 1,000 m as fast as you can hold. Same rower each time if you can.', 11),
  ('500 m row', 'time', 'lower', 'Row 500 m, all out.', 12),
  ('2,000 m row', 'time', 'lower', 'Row 2,000 m at the fastest pace you can hold.', 13),
  ('5 km run', 'time', 'lower', 'Run 5 km.', 14),
  ('Station AMRAP (10 min)', 'rounds_reps', 'higher', 'As many rounds as you can in 10 min of the stations: wall balls, farmers carry, sandbag. Cycle 1 test and retest.', 20),
  ('Toes-to-bar test', 'reps', 'higher', 'Max unbroken reps of your level’s version (knee raises, toes-to-bar). One fresh try.', 21),
  ('Max strict pull-ups', 'reps', 'higher', 'Max strict pull-ups in one go.', 22),
  ('Max dead hang', 'time', 'higher', 'Hang from the bar as long as you can.', 23),
  ('Cindy', 'rounds_reps', 'higher', '20 min, as many rounds as you can: 5 pull-ups, 10 push-ups, 15 air squats.', 30),
  ('Helen (row)', 'time', 'lower', '3 rounds for time: 500 m row, 21 kettlebell swings, 12 pull-ups.', 31),
  ('Helen (run)', 'time', 'lower', '3 rounds for time: 400 m run, 21 kettlebell swings, 12 pull-ups.', 32),
  ('Mini Challenge (row)', 'time', 'lower', '4 legs for time: bike, then a station each leg. Cycle 1, week 9.', 33),
  ('Mini Challenge (run)', 'time', 'lower', '4 legs for time with running between stations. Cycle 1, week 9.', 34),
  ('Fran', 'time', 'lower', '21-15-9 for time: thrusters and pull-ups.', 40),
  ('Grace', 'time', 'lower', '30 clean and jerks for time.', 41),
  ('Karen', 'time', 'lower', '150 wall balls for time.', 42)
on conflict (name) do nothing;

-- Tag Cycle 1's test parts with their benchmark so members can log right from the workout.
create or replace function pg_temp.tag_benchmark(d date, part_title text, bench text, outdoor_bench text)
returns void language sql as $$
  update public.workouts w
  set parts = (
    select jsonb_agg(
      case when p->>'title' = part_title then
        (p || jsonb_build_object('benchmark', bench))
        || case when outdoor_bench is not null and p ? 'outdoor'
             then jsonb_build_object('outdoor', (p->'outdoor') || jsonb_build_object('benchmark', outdoor_bench))
             else '{}'::jsonb end
      else p end
      order by ord)
    from jsonb_array_elements(w.parts) with ordinality as t(p, ord)
  )
  where w.class_date = d and jsonb_typeof(w.parts) = 'array' and jsonb_array_length(w.parts) > 0;
$$;
select pg_temp.tag_benchmark('2026-10-20', '1,000 m row test', '1,000 m row', '1 km run');
select pg_temp.tag_benchmark('2026-12-08', '1,000 m row test', '1,000 m row', '1 km run');
select pg_temp.tag_benchmark('2026-10-23', 'Station test', 'Station AMRAP (10 min)', null);
select pg_temp.tag_benchmark('2026-12-11', 'Station retest', 'Station AMRAP (10 min)', null);
select pg_temp.tag_benchmark('2026-10-27', 'Toes-to-bar test', 'Toes-to-bar test', null);
select pg_temp.tag_benchmark('2026-12-15', 'Toes-to-bar retest', 'Toes-to-bar test', null);
select pg_temp.tag_benchmark('2026-11-13', 'Cindy', 'Cindy', null);
select pg_temp.tag_benchmark('2026-12-16', 'Helen (row version)', 'Helen (row)', 'Helen (run)');
select pg_temp.tag_benchmark('2026-12-18', 'Mini Challenge', 'Mini Challenge (row)', 'Mini Challenge (run)');
