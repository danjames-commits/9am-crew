-- Migration 024: Grok's programming changes, pushed and undone all-or-nothing.
-- The preview tool checks a batch of changes in the app and stores it here as a
-- change set. mcp_push applies a set in one go, refusing it if anything changed
-- since the preview; mcp_undo puts the last push back the way it was, refusing it
-- if anything changed since. Both run as the caller, so the usual admin-only rules
-- on workouts, coach notes and cycles still apply.

create table if not exists public.mcp_change_sets (
  id bigint generated always as identity primary key,
  created_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  status text not null default 'preview' check (status in ('preview', 'invalid', 'pushed', 'undone')),
  summary text not null,
  ops jsonb not null,
  seen jsonb not null,
  before jsonb,
  after_stamps jsonb,
  pushed_at timestamptz,
  undone_at timestamptz
);

alter table public.mcp_change_sets enable row level security;
revoke all on public.mcp_change_sets from anon;

drop policy if exists "admins read own change sets" on public.mcp_change_sets;
create policy "admins read own change sets" on public.mcp_change_sets for select to authenticated
  using ((select public.is_admin()) and created_by = (select auth.uid()));
drop policy if exists "admins add own change sets" on public.mcp_change_sets;
create policy "admins add own change sets" on public.mcp_change_sets for insert to authenticated
  with check ((select public.is_admin()) and created_by = (select auth.uid()));
drop policy if exists "admins edit own change sets" on public.mcp_change_sets;
create policy "admins edit own change sets" on public.mcp_change_sets for update to authenticated
  using ((select public.is_admin()) and created_by = (select auth.uid()))
  with check ((select public.is_admin()) and created_by = (select auth.uid()));

create or replace function public.mcp_push(set_id bigint)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  cs public.mcp_change_sets;
  today date := (now() at time zone 'America/Halifax')::date;
  op jsonb;
  k text;
  d date;
  cid bigint;
  started date;
  stale text[] := '{}';
  b_days jsonb := '{}';
  b_notes jsonb := '{}';
  b_cycles jsonb := '{}';
  a_days jsonb := '{}';
  a_notes jsonb := '{}';
  a_cycles jsonb := '{}';
begin
  if not public.is_admin() then raise exception 'admins only'; end if;

  select * into cs from public.mcp_change_sets s where s.id = set_id and s.created_by = auth.uid() for update;
  if not found then raise exception 'no such change set'; end if;
  if cs.status = 'pushed' then raise exception 'already pushed'; end if;
  if cs.status = 'undone' then raise exception 'already undone'; end if;
  if cs.status = 'invalid' then raise exception 'has problems'; end if;
  if cs.created_at <= now() - interval '24 hours' then raise exception 'expired, preview again'; end if;

  for op in select * from jsonb_array_elements(cs.ops) loop
    if op ? 'date' and (op->>'date')::date <= today then
      raise exception '% is no longer in the future', op->>'date';
    end if;
  end loop;

  -- Nothing may have changed since the preview read it. Stamps compare as times, not text.
  for k in select jsonb_object_keys(coalesce(cs.seen->'days', '{}')) loop
    if (cs.seen->'days'->>k)::timestamptz is distinct from (select w.updated_at from public.workouts w where w.class_date = k::date) then
      stale := stale || k;
    end if;
  end loop;
  for k in select jsonb_object_keys(coalesce(cs.seen->'notes', '{}')) loop
    if (cs.seen->'notes'->>k)::timestamptz is distinct from (select n.updated_at from public.workout_coach_notes n where n.class_date = k::date) then
      stale := stale || ('notes ' || k);
    end if;
  end loop;
  for k in select jsonb_object_keys(coalesce(cs.seen->'cycles', '{}')) loop
    if (cs.seen->'cycles'->>k)::timestamptz is distinct from (select c.updated_at from public.cycles c where c.id = k::bigint) then
      stale := stale || ('cycle ' || k);
    end if;
  end loop;
  if cardinality(stale) > 0 then
    raise exception 'changed since preview: %', array_to_string(stale, ', ');
  end if;

  -- Keep how every target looked first, so undo can put it back.
  for op in select * from jsonb_array_elements(cs.ops) loop
    if op->>'op' in ('put_day', 'delete_day', 'put_notes') then
      d := (op->>'date')::date;
      k := d::text;
      if op->>'op' <> 'put_notes' and not b_days ? k then
        b_days := b_days || jsonb_build_object(k, (select to_jsonb(w) from public.workouts w where w.class_date = d));
      end if;
      if (op->>'op' <> 'put_day' or op ? 'notes') and not b_notes ? k then
        b_notes := b_notes || jsonb_build_object(k, (select n.body from public.workout_coach_notes n where n.class_date = d));
      end if;
    elsif op->>'op' in ('update_cycle', 'delete_cycle') then
      k := op->>'id';
      if not b_cycles ? k then
        b_cycles := b_cycles || jsonb_build_object(k, (select to_jsonb(c) from public.cycles c where c.id = k::bigint));
      end if;
    end if;
  end loop;

  for op in select * from jsonb_array_elements(cs.ops) loop
    case op->>'op'
      when 'put_day' then
        d := (op->>'date')::date;
        insert into public.workouts (class_date, title, focus, why, parts, status)
          select d, r.title, r.focus, r.why, r.parts, r.status from jsonb_populate_record(null::public.workouts, op->'row') r
          on conflict (class_date) do update set title = excluded.title, focus = excluded.focus, why = excluded.why,
            parts = excluded.parts, status = excluded.status, updated_at = now();
        if op ? 'notes' then
          if jsonb_typeof(op->'notes') = 'string' then
            insert into public.workout_coach_notes (class_date, body) values (d, op->>'notes')
              on conflict (class_date) do update set body = excluded.body, updated_at = now();
          else
            delete from public.workout_coach_notes n where n.class_date = d;
          end if;
        end if;
      when 'delete_day' then
        delete from public.workouts w where w.class_date = (op->>'date')::date; -- notes go with it
      when 'put_notes' then
        d := (op->>'date')::date;
        if jsonb_typeof(op->'body') = 'string' then
          insert into public.workout_coach_notes (class_date, body) values (d, op->>'body')
            on conflict (class_date) do update set body = excluded.body, updated_at = now();
        else
          delete from public.workout_coach_notes n where n.class_date = d;
        end if;
      when 'create_cycle' then
        begin
          insert into public.cycles (start_date, week_count, name, why, brief, goals, weeks, days)
            select r.start_date, r.week_count, r.name, r.why, r.brief, r.goals, r.weeks, r.days
            from jsonb_populate_record(null::public.cycles, op->'row') r
            returning id into cid;
        exception when exclusion_violation then
          raise exception 'those dates overlap another cycle';
        end;
        b_cycles := b_cycles || jsonb_build_object(cid::text, null); -- created: undo deletes it
      when 'update_cycle' then
        begin
          update public.cycles c set start_date = r.start_date, week_count = r.week_count, name = r.name, why = r.why,
              brief = r.brief, goals = r.goals, weeks = r.weeks, days = r.days, updated_at = now()
            from jsonb_populate_record(null::public.cycles, op->'row') r
            where c.id = (op->>'id')::bigint;
        exception when exclusion_violation then
          raise exception 'those dates overlap another cycle';
        end;
        if not found then raise exception 'cycle % no longer exists', op->>'id'; end if;
      when 'delete_cycle' then
        select c.start_date into started from public.cycles c where c.id = (op->>'id')::bigint;
        if not found then raise exception 'cycle % no longer exists', op->>'id'; end if;
        if started <= today then raise exception 'cycle % has already started', op->>'id'; end if;
        delete from public.cycles c where c.id = (op->>'id')::bigint;
      else
        raise exception 'unknown change: %', op->>'op';
    end case;
  end loop;

  for k in select jsonb_object_keys(b_days) loop
    a_days := a_days || jsonb_build_object(k, (select w.updated_at from public.workouts w where w.class_date = k::date));
  end loop;
  for k in select jsonb_object_keys(b_notes) loop
    a_notes := a_notes || jsonb_build_object(k, (select n.updated_at from public.workout_coach_notes n where n.class_date = k::date));
  end loop;
  for k in select jsonb_object_keys(b_cycles) loop
    a_cycles := a_cycles || jsonb_build_object(k, (select c.updated_at from public.cycles c where c.id = k::bigint));
  end loop;

  cs.before := jsonb_build_object('days', b_days, 'notes', b_notes, 'cycles', b_cycles);
  update public.mcp_change_sets s set
    status = 'pushed',
    pushed_at = now(),
    before = cs.before,
    after_stamps = jsonb_build_object('days', a_days, 'notes', a_notes, 'cycles', a_cycles)
  where s.id = cs.id;

  -- What it touched: { ok, set_id, days, cycles }.
  return jsonb_build_object(
    'ok', true,
    'set_id', cs.id,
    'days', (select coalesce(jsonb_agg(x order by x), '[]') from jsonb_object_keys((cs.before->'days') || (cs.before->'notes')) x),
    'cycles', (select coalesce(jsonb_agg(x::bigint order by x::bigint), '[]') from jsonb_object_keys(cs.before->'cycles') x)
  );
end $$;

create or replace function public.mcp_undo(set_id bigint default null)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  cs public.mcp_change_sets;
  today date := (now() at time zone 'America/Halifax')::date;
  k text;
  v jsonb;
  cols text;
  stale text[] := '{}';
begin
  if not public.is_admin() then raise exception 'admins only'; end if;

  if set_id is null then
    select * into cs from public.mcp_change_sets s
      where s.created_by = auth.uid() and s.status = 'pushed'
      order by s.pushed_at desc, s.id desc limit 1 for update;
    if not found then raise exception 'nothing to undo'; end if;
  else
    select * into cs from public.mcp_change_sets s where s.id = set_id and s.created_by = auth.uid() for update;
    if not found then raise exception 'no such change set'; end if;
    if cs.status = 'undone' then raise exception 'already undone'; end if;
    if cs.status <> 'pushed' then raise exception 'nothing to undo'; end if;
  end if;

  for k in select jsonb_object_keys((cs.before->'days') || (cs.before->'notes')) loop
    if k::date <= today then raise exception '% is no longer in the future', k; end if;
  end loop;

  -- Nothing may have changed since the push.
  for k in select jsonb_object_keys(cs.after_stamps->'days') loop
    if (cs.after_stamps->'days'->>k)::timestamptz is distinct from (select w.updated_at from public.workouts w where w.class_date = k::date) then
      stale := stale || k;
    end if;
  end loop;
  for k in select jsonb_object_keys(cs.after_stamps->'notes') loop
    if (cs.after_stamps->'notes'->>k)::timestamptz is distinct from (select n.updated_at from public.workout_coach_notes n where n.class_date = k::date) then
      stale := stale || ('notes ' || k);
    end if;
  end loop;
  for k in select jsonb_object_keys(cs.after_stamps->'cycles') loop
    if (cs.after_stamps->'cycles'->>k)::timestamptz is distinct from (select c.updated_at from public.cycles c where c.id = k::bigint) then
      stale := stale || ('cycle ' || k);
    end if;
  end loop;
  if cardinality(stale) > 0 then
    raise exception 'changed since that push: %', array_to_string(stale, ', ');
  end if;

  -- Days before notes: a note needs its workout.
  for k, v in select * from jsonb_each(cs.before->'days') loop
    if jsonb_typeof(v) = 'null' then
      delete from public.workouts w where w.class_date = k::date;
    else
      update public.workouts w set title = v->>'title', focus = v->>'focus', why = v->>'why', parts = v->'parts',
          status = v->>'status', updated_at = (v->>'updated_at')::timestamptz
        where w.class_date = k::date;
      if not found then
        -- It was deleted: bring back the whole row (a new id; future days have no comments).
        select string_agg(quote_ident(c), ', ') into cols from jsonb_object_keys(v) c where c <> 'id';
        execute format('insert into public.workouts (%1$s) select %1$s from jsonb_populate_record(null::public.workouts, $1)', cols) using v;
      end if;
    end if;
  end loop;

  for k, v in select * from jsonb_each(cs.before->'notes') loop
    if jsonb_typeof(v) = 'null' then
      delete from public.workout_coach_notes n where n.class_date = k::date;
    else
      insert into public.workout_coach_notes (class_date, body) values (k::date, v #>> '{}')
        on conflict (class_date) do update set body = excluded.body, updated_at = now();
    end if;
  end loop;

  -- Remove created cycles first so restored ones have room.
  delete from public.cycles c
    where c.id in (select e.key::bigint from jsonb_each(cs.before->'cycles') e where jsonb_typeof(e.value) = 'null');
  for k, v in select * from jsonb_each(cs.before->'cycles') e where jsonb_typeof(e.value) <> 'null' loop
    begin
      update public.cycles c set start_date = r.start_date, week_count = r.week_count, name = r.name, why = r.why,
          brief = r.brief, goals = r.goals, weeks = r.weeks, days = r.days, updated_at = r.updated_at
        from jsonb_populate_record(null::public.cycles, v) r
        where c.id = k::bigint;
      if not found then
        insert into public.cycles (id, start_date, week_count, name, why, brief, goals, weeks, days, created_by, updated_at)
          overriding system value
          select r.id, r.start_date, r.week_count, r.name, r.why, r.brief, r.goals, r.weeks, r.days, r.created_by, r.updated_at
          from jsonb_populate_record(null::public.cycles, v) r;
      end if;
    exception when exclusion_violation then
      raise exception 'those dates overlap another cycle';
    end;
  end loop;

  update public.mcp_change_sets s set status = 'undone', undone_at = now() where s.id = cs.id;

  return jsonb_build_object(
    'ok', true,
    'set_id', cs.id,
    'days', (select coalesce(jsonb_agg(x order by x), '[]') from jsonb_object_keys((cs.before->'days') || (cs.before->'notes')) x),
    'cycles', (select coalesce(jsonb_agg(x::bigint order by x::bigint), '[]') from jsonb_object_keys(cs.before->'cycles') x)
  );
end $$;

revoke all on function public.mcp_push(bigint) from public, anon;
revoke all on function public.mcp_undo(bigint) from public, anon;
grant execute on function public.mcp_push(bigint) to authenticated;
grant execute on function public.mcp_undo(bigint) to authenticated;
