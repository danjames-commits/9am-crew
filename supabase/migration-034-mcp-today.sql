-- Migration 034: the MCP can change today's workout until a member enters something for it.
-- Comments, surveys, lift logs and benchmark results lock the day. Sign-ups don't: people tap
-- "I'm in" ahead of class. Today can't be deleted. Earlier days stay read-only.

-- Definer so it sees every member's rows; only admins get a real answer.
create or replace function public.mcp_day_has_entries(d date)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() and (
    exists (select 1 from public.comments c join public.workouts w on w.id = c.workout_id where w.class_date = d)
    or exists (select 1 from public.workout_surveys s where s.class_date = d and not s.skipped)
    or exists (select 1 from public.lift_logs l where l.logged_on = d)
    or exists (select 1 from public.benchmark_results b where b.workout_date = d)
  );
$$;
revoke all on function public.mcp_day_has_entries(date) from public, anon;
grant execute on function public.mcp_day_has_entries(date) to authenticated;

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
    if op ? 'date' and (op->>'date')::date < today then
      raise exception '% is no longer in the future', op->>'date';
    end if;
    if op ? 'date' and (op->>'date')::date = today then
      if op->>'op' = 'delete_day' then raise exception 'today''s workout can''t be deleted'; end if;
      if public.mcp_day_has_entries(today) then raise exception 'members have already entered something for %', today; end if;
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
        if (op->'row'->>'start_date')::date <= today then raise exception 'new cycle must start after today'; end if;
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
        select c.start_date into started from public.cycles c where c.id = (op->>'id')::bigint;
        if not found then raise exception 'cycle % no longer exists', op->>'id'; end if;
        -- A running cycle can be edited, but not moved. One that hasn't started can't move to today or earlier.
        if started <= today and (op->'row'->>'start_date')::date is distinct from started then
          raise exception 'cycle % has already started', op->>'id';
        elsif started > today and (op->'row'->>'start_date')::date <= today then
          raise exception 'cycle % must start after today', op->>'id';
        end if;
        begin
          update public.cycles c set start_date = r.start_date, week_count = r.week_count, name = r.name, why = r.why,
              brief = r.brief, goals = r.goals, weeks = r.weeks, days = r.days, updated_at = now()
            from jsonb_populate_record(null::public.cycles, op->'row') r
            where c.id = (op->>'id')::bigint;
        exception when exclusion_violation then
          raise exception 'those dates overlap another cycle';
        end;
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
  -- Notes on every touched day too, so undo notices a note added after the push.
  for k in select jsonb_object_keys(b_notes || b_days) loop
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
  started date;
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
    if k::date < today then raise exception '% is no longer in the future', k; end if;
    if k::date = today and public.mcp_day_has_entries(today) then
      raise exception 'members have already entered something for %', today;
    end if;
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

  -- Never remove, move or bring back a cycle that has started. Editing one in place is fine.
  for k, v in select * from jsonb_each(cs.before->'cycles') loop
    select c.start_date into started from public.cycles c where c.id = k::bigint;
    if jsonb_typeof(v) = 'null' then
      if found and started <= today then raise exception 'cycle % has already started', k; end if;
    elsif found then
      if (started <= today or (v->>'start_date')::date <= today) and (v->>'start_date')::date <> started then
        raise exception 'cycle % has already started', k;
      end if;
    elsif (v->>'start_date')::date <= today then
      raise exception 'cycle % has already started', k;
    end if;
  end loop;

  -- Undoing a created day deletes it, and its comments with it: refuse once members have commented.
  for k, v in select * from jsonb_each(cs.before->'days') loop
    if jsonb_typeof(v) = 'null' and exists (
      select 1 from public.comments c join public.workouts w on w.id = c.workout_id where w.class_date = k::date
    ) then
      raise exception 'day % has member comments now', k;
    end if;
  end loop;

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
