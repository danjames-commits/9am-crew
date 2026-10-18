// Runs supabase/schema.sql in a real (in-memory) Postgres and checks the
// security rules and personal-best logic. Usage: npm run test:db
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const db = new PGlite();

// Minimal stand-in for what Supabase provides.
await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}'::jsonb);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to authenticated, anon;
  grant usage on schema public to authenticated, anon;
  alter default privileges in schema public grant all on tables to authenticated, anon;
  alter default privileges in schema public grant all on sequences to authenticated, anon;
  alter default privileges in schema public grant execute on functions to authenticated, anon;
`);

await db.exec(readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8'));
await db.exec(readFileSync(new URL('../supabase/migration-003-claude.sql', import.meta.url), 'utf8'));
await db.exec(readFileSync(new URL('../supabase/migration-004-cycles.sql', import.meta.url), 'utf8'));
await db.exec(readFileSync(new URL('../supabase/migration-006-animals.sql', import.meta.url), 'utf8'));
await db.exec(readFileSync(new URL('../supabase/migration-007-custom-avatars.sql', import.meta.url), 'utf8'));
await db.exec(readFileSync(new URL('../supabase/migration-008-coach-notes.sql', import.meta.url), 'utf8'));
await db.exec(readFileSync(new URL('../supabase/migration-009-faster-rls.sql', import.meta.url), 'utf8'));

const A = '00000000-0000-0000-0000-00000000000a';
const B = '00000000-0000-0000-0000-00000000000b';
const C = '00000000-0000-0000-0000-00000000000c';
await db.exec(`
  insert into auth.users (id, email, raw_user_meta_data) values
    ('${A}', 'linda@example.com', '{"display_name":"Linda"}'),
    ('${B}', 'marie@example.com', '{}'),
    ('${C}', 'gord@example.com', '{}');
`);

async function as(user, sql, params) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${user}', false);`);
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec(`reset role;`);
  }
}
async function fails(user, sql, label) {
  let threw = false;
  try { await as(user, sql); } catch { threw = true; }
  assert.ok(threw, `expected failure: ${label}`);
}
let passed = 0;
const ok = (label) => { passed++; console.log('  ✓', label); };

// First user is admin, others wait for approval.
let r = await db.query(`select id, display_name, is_admin, approved from public.profiles order by id`);
assert.deepEqual(r.rows.map((x) => [x.display_name, x.is_admin, x.approved]),
  [['Linda', true, true], ['marie', false, false], ['gord', false, false]]);
ok('first sign-up becomes admin; names default from email');

r = await as(B, `select count(*)::int as n from public.profiles`);
assert.equal(r.rows[0].n, 1);
ok('unapproved member sees only themselves');

await fails(B, `insert into public.messages (body) values ('hi')`, 'unapproved chat');
ok('unapproved member cannot post');

await fails(B, `update public.profiles set is_admin = true where id = '${B}'`, 'self-promote');
ok('members cannot make themselves admin');

await fails(B, `select public.admin_set_member('${B}', true, true)`, 'non-admin approve');
await as(A, `select public.admin_set_member('${B}', true, false)`);
await as(A, `select public.admin_set_member('${C}', true, true)`);
r = await db.query(`select display_name, is_admin, approved from public.profiles order by id`);
assert.deepEqual(r.rows.map((x) => [x.is_admin, x.approved]), [[true, true], [false, true], [true, true]]);
ok('admin approves members and appoints another admin');

await fails(A, `select public.admin_set_member('${A}', true, false)`, 'remove own admin');
ok('admins cannot lock themselves out');

await as(B, `update public.profiles set level = 3, display_name = 'Marie' where id = '${B}'`);
r = await db.query(`select level, display_name from public.profiles where id = '${B}'`);
assert.deepEqual([r.rows[0].level, r.rows[0].display_name], [3, 'Marie']);
ok('members set their own name and level');
await as(B, `update public.profiles set animal = 'raccoon' where id = '${B}'`);
await fails(B, `update public.profiles set animal = 'lion' where id = '${B}'`, 'too much energy');
await as(B, `update public.profiles set animal = 'sloth' where id = '${A}'`);
r = await db.query(`select id, animal from public.profiles where id in ('${A}', '${B}') order by id`);
assert.deepEqual(r.rows.map((x) => x.animal), [null, 'raccoon']);
ok('members pick their own spirit animal (mid-energy only)');

const pic = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40"/></svg>`;
await as(B, `insert into public.avatars (user_id, prompt, name, svg) values ('${B}', 'grumpy beaver', 'Grumpy beaver', '${pic}')`);
await as(B, `update public.profiles set animal = 'custom:a1b2' where id = '${B}'`);
await fails(B, `insert into public.avatars (user_id, prompt, name, svg) values ('${A}', 'x', 'x', '${pic}')`, 'draw for someone else');
await fails(B, `update public.avatars set svg = '<svg><script>alert(1)</script></svg>' where user_id = '${B}'`, 'script in svg');
await fails(B, `update public.profiles set animal = 'custom:../../x' where id = '${B}'`, 'bad custom id');
r = await as(C, `select name from public.avatars`);
assert.deepEqual(r.rows.map((x) => x.name), ['Grumpy beaver']);
ok('custom drawn avatars: own only, no scripts, crew can see them');

// Workouts: drafts hidden from members.
await as(A, `insert into public.workouts (class_date, title, parts, status) values ('2026-10-16', 'Friday Grinder', '[]', 'draft')`);
r = await as(B, `select count(*)::int as n from public.workouts`);
assert.equal(r.rows[0].n, 0);
await fails(B, `insert into public.workouts (class_date, title) values ('2026-10-19', 'Mine')`, 'member writes workout');
await as(C, `update public.workouts set status = 'published' where class_date = '2026-10-16'`);
r = await as(B, `select id from public.workouts`);
assert.equal(r.rows.length, 1);
const wid = r.rows[0].id;
ok('only admins write workouts; members see published ones');

await as(B, `insert into public.comments (workout_id, body) values (${wid}, 'Can we row instead?')`);
await as(B, `insert into public.attendance (class_date) values ('2026-10-16')`);
await fails(B, `insert into public.attendance (class_date, user_id) values ('2026-10-16', '${C}')`, 'check in someone else');
r = await as(C, `select count(*)::int as n from public.attendance`);
assert.equal(r.rows[0].n, 1);
ok('comments and check-ins work; cannot check in someone else');

// Personal bests.
const squat = (await db.query(`select id from public.movements where name = 'Back squat'`)).rows[0].id;
const log = (w, reps) => as(B, `insert into public.lift_logs (movement_id, weight, reps) values (${squat}, ${w}, ${reps}) returning is_pr`).then((x) => x.rows[0].is_pr);
assert.equal(await log(135, 5), false, 'first log is baseline');
assert.equal(await log(135, 3), false, 'fewer reps same weight');
assert.equal(await log(140, 3), true, 'heavier');
assert.equal(await log(135, 6), true, 'more reps');
assert.equal(await log(137.5, 1), false, 'beaten by 140x3');
assert.equal((await as(B, `insert into public.lift_logs (movement_id, weight, reps, logged_on) values (${squat}, 300, 1, null) returning is_pr`)).rows[0].is_pr, false);
ok('personal bests detected correctly; old lifts with no date are never announced');

r = await as(C, `select body, kind, lift_log_id from public.messages order by id`);
assert.deepEqual(r.rows.map((x) => x.body), ['Back squat · 140 lb × 3', 'Back squat · 135 lb × 6']);
ok('each personal best is posted to chat');

const prId = r.rows[0].lift_log_id;
await as(C, `insert into public.cheers (lift_log_id) values (${prId})`);
await fails(C, `insert into public.cheers (lift_log_id) values (${prId})`, 'double cheer');
await fails(C, `insert into public.messages (body, kind) values ('fake', 'pr')`, 'fake PR message');
ok('cheers work once per person; nobody can fake a PR post');

await as(A, `update public.program set goals = array['First strict pull-up'], cycle_start = '2026-10-05'`);
await as(B, `update public.program set goals = array['hack']`);
r = await db.query(`select goals from public.program`);
assert.deepEqual(r.rows[0].goals, ['First strict pull-up']);
ok('only admins change the program');

// Friday recap: posts once per week, authorless, approved members only.
r = await as(B, `select public.post_weekly_recap('2026-10-19', 'Great week, crew!') as ok`);
assert.equal(r.rows[0].ok, true);
r = await as(C, `select public.post_weekly_recap('2026-10-19', 'Again?') as ok`);
assert.equal(r.rows[0].ok, false);
await fails(B, `select public.post_weekly_recap('2026-10-21', 'Wednesday?')`, 'recap not on Monday');
r = await as(C, `select user_id, kind, body from public.messages where kind = 'recap'`);
assert.deepEqual(r.rows.map((x) => [x.user_id, x.body]), [[null, 'Great week, crew!']]);
await fails(B, `insert into public.messages (body, kind) values ('fake', 'recap')`, 'fake recap');
ok('weekly recap posts once, from the app, and cannot be faked');

await as(B, `insert into public.ai_requests (kind) values ('scale')`);
await fails(B, `insert into public.ai_requests (kind, user_id) values ('scale', '${C}')`, 'log for someone else');
r = await as(C, `select count(*)::int as n from public.ai_requests`);
assert.equal(r.rows[0].n, 0);
ok('Claude usage log is private to each person');

// Planned cycles: admins only, Mondays only, no overlaps.
const wk = (n) => JSON.stringify(Array.from({ length: n }, () => ({ kind: 'build', label: 'Build', pct: 70, sets: 5, reps: 5 })));
const cyc = (start, n) => `insert into public.cycles (start_date, week_count, name, weeks, days) values ('${start}', ${n}, 'Test', '${wk(n)}', '{}') returning end_date::text`;
r = await as(A, cyc('2026-11-30', 6));
assert.equal(r.rows[0].end_date, '2027-01-11');
await fails(B, cyc('2027-01-11', 4), 'member plans a cycle');
await fails(A, cyc('2026-12-14', 4), 'overlapping cycle');
await fails(A, cyc('2027-01-12', 4), 'cycle not on a Monday');
await fails(A, `insert into public.cycles (start_date, week_count, weeks, days) values ('2027-01-11', 4, '${wk(3)}', '{}')`, 'week count mismatch');
await as(A, cyc('2027-01-11', 4));
r = await as(B, `select count(*)::int as n from public.cycles`);
assert.equal(r.rows[0].n, 2);
await as(B, `delete from public.cycles`);
r = await as(B, `select count(*)::int as n from public.cycles`);
assert.equal(r.rows[0].n, 2);
await as(A, `insert into public.ai_requests (kind) values ('plan')`);
ok('planned cycles: admins only, start on Mondays, never overlap');

await as(A, `insert into public.workouts (class_date, title) values ('2026-11-02', 'Test day')`);
await as(A, `insert into public.workouts (class_date, title) values ('2026-11-04', 'Test day 2')`);
await as(A, `insert into public.workout_coach_notes (class_date, body) values ('2026-11-02', 'Run in two waves')`);
r = await as(C, `select body from public.workout_coach_notes`);
assert.deepEqual(r.rows.map((x) => x.body), ['Run in two waves']);
r = await as(B, `select count(*)::int as n from public.workout_coach_notes`);
assert.equal(r.rows[0].n, 0);
await fails(B, `insert into public.workout_coach_notes (class_date, body) values ('2026-11-04', 'x')`, 'member writes coach notes');
await as(B, `update public.workout_coach_notes set body = 'hacked'`);
r = await db.query(`select body from public.workout_coach_notes`);
assert.equal(r.rows[0].body, 'Run in two waves');
await fails(A, `insert into public.workout_coach_notes (class_date, body) values ('2026-11-03', 'no workout')`, 'notes without a workout');
await fails(A, `insert into public.workout_coach_notes (class_date, body) values ('2026-11-04', '')`, 'empty note');
await as(B, `delete from public.workout_coach_notes`);
r = await db.query(`select body from public.workout_coach_notes where class_date = '2026-11-02'`);
assert.equal(r.rows.length, 1);
await as(A, `delete from public.workouts where class_date = '2026-11-02'`);
r = await db.query(`select count(*)::int as n from public.workout_coach_notes`);
assert.equal(r.rows[0].n, 0);
await as(A, `delete from public.workouts where class_date = '2026-11-04'`);
ok('coach notes: admins only, need a workout, go when the workout goes');

await as(A, `select public.admin_remove_member('${C}')`);
r = await db.query(`select count(*)::int as n from public.profiles`);
assert.equal(r.rows[0].n, 2);
ok('admin can remove a member');

console.log(`\nDatabase checks passed: ${passed}`);
