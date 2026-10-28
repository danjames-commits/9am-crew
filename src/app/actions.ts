'use server';
import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { ensurePrArt } from '@/lib/pr-art';
import { EQUIPMENT } from '@/lib/equipment';
import { ALL_CLOCK_BUTTONS, findClock, pressButton } from '@/lib/switchbot';
import { CLOCK_TESTS } from '@/lib/clock-tests';
import { BRIEF_MAX, DEFAULT_COACH_BRIEF, getCoachBrief } from '@/lib/coach-brief';
import { redirect } from 'next/navigation';
import { requireMember, supabaseServer } from '@/lib/supabase/server';
import type { Part, WorkoutDraft } from '@/lib/types';
import { aiEnabled, draftClockPlan, draftWorkout, drawAnimal, planCycle, scaleAdvice, takeAllowance } from '@/lib/ai';
import { cleanPlan as cleanClockPlan, type ClockPlan } from '@/lib/clock-plan';
import { partsFingerprint } from '@/lib/clock-week';
import { cleanSvg, svgVersion } from '@/lib/svg-clean';
import { cleanPlan, type PlanDraft } from '@/lib/programming/plan';
import { isWeekday, todayLocal } from '@/lib/dates';
import { getBests, getSchedule } from '@/lib/data';
import { classWeather } from '@/lib/weather';
import { isAnimal } from '@/lib/animals';
import { cleanParts, cleanWorkoutFields } from '@/lib/workout-clean';
import { cleanCoachNotes } from '@/lib/coach-notes';
import { isNewBest, readScore, type Benchmark, type BenchResult, type ScoreType } from '@/lib/benchmarks';

const isDate = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

// ---------------- Account ----------------

export async function signOut() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function updateMe(input: {
  display_name: string;
  level: number;
  /** A preset animal id, 'custom' for a drawn one, or null for initials. */
  animal?: string | null;
  /** A new drawing to keep (when animal is 'custom'). */
  drawing?: { prompt: string; name: string; svg: string } | null;
  show_in_showups?: boolean;
  share_prs?: boolean;
}) {
  const { supabase, me } = await requireMember();
  const display_name = input.display_name.trim().slice(0, 40);
  const level = Math.round(input.level);
  if (!display_name || level < 1 || level > 4) return { error: 'Please add a name and pick a level.' };
  let animal: string | null = input.animal && isAnimal(input.animal) ? input.animal : null;
  if (input.animal === 'custom') {
    if (input.drawing) {
      const svg = cleanSvg(input.drawing.svg);
      if (!svg) return { error: 'That drawing didn’t pass the safety check. Try drawing it again.' };
      const { error: saveError } = await supabase.from('avatars').upsert({
        user_id: me.id,
        prompt: input.drawing.prompt.trim().slice(0, 120) || 'spirit animal',
        name: input.drawing.name.trim().slice(0, 60) || 'Spirit animal',
        svg,
        updated_at: new Date().toISOString(),
      });
      if (saveError) return { error: saveError.message };
      animal = `custom:${svgVersion(svg)}`;
    } else {
      const { data: saved } = await supabase.from('avatars').select('svg').eq('user_id', me.id).maybeSingle();
      if (!saved) return { error: 'Draw your animal first.' };
      animal = `custom:${svgVersion(saved.svg)}`;
    }
  }
  const privacy = {
    ...(typeof input.show_in_showups === 'boolean' ? { show_in_showups: input.show_in_showups } : {}),
    ...(typeof input.share_prs === 'boolean' ? { share_prs: input.share_prs } : {}),
  };
  const { error } = await supabase.from('profiles').update({ display_name, level, animal, ...privacy }).eq('id', me.id);
  if (error) return { error: error.message };
  revalidatePath('/', 'layout');
  return { ok: true };
}

/** Change just your level (from the My lifts page). */
export async function setLevel(level: number) {
  const { supabase, me } = await requireMember();
  const n = Math.round(level);
  if (!(n >= 1 && n <= 4)) return { error: 'Pick a level from 1 to 4.' };
  const { error } = await supabase.from('profiles').update({ level: n }).eq('id', me.id);
  if (error) return { error: 'Couldn’t save that. Try again.' };
  revalidatePath('/', 'layout');
  return { ok: true };
}

/** Your weekly attendance goal: 1 to 5 classes a week. */
/** After class: save someone's quick survey (or that they skipped it). Only saved for now. */
export async function saveSurvey(classDate: string, answer: { hard: number; length: number } | 'skip') {
  if (!isDate(classDate)) return { error: 'Bad date' };
  const { supabase, me } = await requireMember();
  const ok = (n: number) => Number.isInteger(n) && n >= 1 && n <= 3;
  const row: { class_date: string; level: number; skipped?: boolean; hard?: number; length?: number } | null =
    answer === 'skip'
      ? { class_date: classDate, skipped: true, level: me.level }
      : ok(answer.hard) && ok(answer.length)
        ? { class_date: classDate, hard: answer.hard, length: answer.length, level: me.level }
        : null;
  if (!row) return { error: 'Pick an answer for both.' };
  const { error } = await supabase.from('workout_surveys').upsert(row, { onConflict: 'user_id,class_date', ignoreDuplicates: true });
  if (error) return { error: 'Couldn’t save that. Try again.' };
  return { ok: true };
}

export async function setWeeklyGoal(goal: number) {
  const { supabase, me } = await requireMember();
  const n = Math.round(goal);
  if (!(n >= 1 && n <= 5)) return { error: 'Pick 1 to 5 classes a week.' };
  const { error } = await supabase.from('profiles').update({ weekly_goal: n }).eq('id', me.id);
  if (error) return { error: 'Couldn’t save that. Try again.' };
  revalidatePath('/lifts/attendance');
  return { ok: true };
}

/** Coaches: press one button on the gym clock's remote, through the SwitchBot hub. */
export async function pressClock(button: string) {
  await requireMember({ coach: true });
  if (!ALL_CLOCK_BUTTONS.includes(button)) return { error: 'Unknown button' };
  try {
    const clock = await findClock();
    if (!clock) return { error: 'No remote named “Gym clock” in SwitchBot yet.' };
    await pressButton(clock.deviceId, button);
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'SwitchBot didn’t answer.' };
  }
}

/** Coaches: press a run of clock buttons in order (timers in coach mode, and the setup tests). */
export async function pressClockSequence(buttons: string[]) {
  await requireMember({ coach: true });
  if (!buttons.length || buttons.length > 40 || !buttons.every((b) => ALL_CLOCK_BUTTONS.includes(b))) return { error: 'Unknown button' };
  try {
    const clock = await findClock();
    if (!clock) return { error: 'No remote named “Gym clock” in SwitchBot yet.' };
    for (const b of buttons) {
      await pressButton(clock.deviceId, b);
      // A gap so presses arrive in order. 2 s was safe but slow; 1 s once clearing first fixed the leftovers (Dan, Oct 27).
      await new Promise((r) => setTimeout(r, 1000));
    }
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'SwitchBot didn’t answer.' };
  }
}

/** The time of day in Halifax at a moment, as hours (0–23) and minutes. */
function halifaxTime(ms: number) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Halifax', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(ms));
  return { h: Number(parts.find((p) => p.type === 'hour')?.value), m: Number(parts.find((p) => p.type === 'minute')?.value) };
}

/**
 * Admins: set the clock's time of day to Halifax time. Types the hours and minutes for
 * the next whole minute, then waits and presses OK right as that minute starts.
 * Minutes first, then hours, the way Dan set it by hand (gym video, Oct 23).
 */
export async function setClockTime(format: 12 | 24) {
  await requireMember({ admin: true });
  const GAP = 1000;
  const before = ['Exit', 'Right', 'm', 'm', 'Left', 'h', 'h'];
  // Aim for the first whole minute after the typing is done (with a few seconds' room).
  const target = Math.ceil((Date.now() + before.length * (GAP + 600) + 4000) / 60000) * 60000;
  const { h, m } = halifaxTime(target);
  const hour = format === 24 ? h : h % 12 || 12;
  const hh = String(hour).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  // Dan's video (Oct 23): Exit, Right (minutes flash), two minute digits, Left (hours flash),
  // two hour digits, OK. The first digit replaces the old value, so nothing to clear.
  const buttons = ['Exit', 'Right', mm[0], mm[1], 'Left', hh[0], hh[1]];
  try {
    const clock = await findClock();
    if (!clock) return { error: 'No remote named “Gym clock” in SwitchBot yet.' };
    for (const b of buttons) {
      await pressButton(clock.deviceId, b);
      await new Promise((r) => setTimeout(r, GAP));
    }
    const wait = target - Date.now();
    if (wait < 0) return { error: 'SwitchBot was too slow that time. Try again.' };
    await new Promise((r) => setTimeout(r, wait));
    await pressButton(clock.deviceId, 'OK');
    return { ok: true, set: `${hour}:${mm}${format === 12 ? (h < 12 ? ' AM' : ' PM') : ''}` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'SwitchBot didn’t answer.' };
  }
}

/** Admins: note what a clock test did, so the timer can be built on what's true for our clock. */
export async function recordClockFinding(id: string, result: 'yes' | 'no', note: string) {
  const { supabase, me } = await requireMember({ admin: true });
  if (id !== 'learned' && !CLOCK_TESTS.some((t) => t.id === id)) return { error: 'Unknown test' };
  const { data } = await supabase.from('program').select('clock_findings').eq('id', 1).maybeSingle();
  const findings = { ...((data?.clock_findings as Record<string, unknown>) ?? {}), [id]: { result, note: note.trim().slice(0, 300), by: me.display_name, at: new Date().toISOString() } };
  const { error } = await supabase.from('program').update({ clock_findings: findings }).eq('id', 1);
  if (error) return { error: 'Couldn’t save that.' };
  revalidatePath('/admin/clock');
  return { ok: true };
}

/** Coaches: save the gym clock timers for a workout's parts. */
export async function saveClockPlan(date: string, plan: ClockPlan) {
  if (!isDate(date)) return { error: 'Bad date' };
  const { supabase } = await requireMember({ coach: true });
  const { data: w } = await supabase.from('workouts').select('parts').eq('class_date', date).maybeSingle();
  if (!w) return { error: 'No workout that day.' };
  const clean = cleanClockPlan(plan, (w.parts as Part[]).length);
  // Marked as the coach's, so Claude won't redo them if the workout changes.
  const { error } = await supabase.rpc('set_clock_plan', { d: date, plan: clean, by_who: 'coach', fp: null });
  if (error) return { error: 'Couldn’t save the timers. Try again.' };
  revalidatePath(`/workouts/${date}`);
  return { ok: true, plan: clean };
}

/** Coaches: have Claude read the workout and fill in the clock timers (replaces what's there). */
export async function draftClockTimers(date: string) {
  if (!isDate(date)) return { error: 'Bad date' };
  const { supabase, me } = await requireMember({ coach: true });
  if (!aiEnabled()) return { error: 'Claude isn’t set up yet.' };
  const { data: w } = await supabase.from('workouts').select('parts').eq('class_date', date).maybeSingle();
  if (!w) return { error: 'No workout that day.' };
  if (!(await takeAllowance(supabase, me.id, 'clock'))) return { error: 'Daily limit reached. Set the timers by hand for now.' };
  try {
    const brief = await getCoachBrief(supabase);
    const plan = await draftClockPlan({ parts: w.parts as Part[], brief: brief.body });
    const { error } = await supabase.rpc('set_clock_plan', { d: date, plan, by_who: 'claude', fp: partsFingerprint(w.parts) });
    if (error) return { error: 'Couldn’t save the timers. Try again.' };
    revalidatePath(`/workouts/${date}`);
    return { ok: true, plan };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Claude didn’t answer. Try again.' };
  }
}

/** Admins: change a workout's equipment list (additions and removals on top of what the app reads). */
export async function setWorkoutEquipment(date: string, add: string[], remove: string[]) {
  if (!isDate(date)) return { error: 'Bad date' };
  const { supabase } = await requireMember({ admin: true });
  const clean = (l: string[]) => [...new Set(l.filter((k) => EQUIPMENT.includes(k)))];
  const { error } = await supabase.from('workouts').update({ equipment_add: clean(add), equipment_remove: clean(remove) }).eq('class_date', date);
  if (error) return { error: 'Couldn’t save that. Try again.' };
  revalidatePath(`/workouts/${date}`);
  return { ok: true };
}

/** Admins: have Claude draw someone's personal-best animation again. Takes about half a minute. */
export async function redrawPrArt(userId: string, movementId: number) {
  const { supabase, me } = await requireMember({ admin: true });
  if (!/^[0-9a-f-]{36}$/i.test(userId) || !Number.isInteger(movementId)) return { error: 'Bad request' };
  const r = await ensurePrArt(supabase, { userId, movementId, actorId: me.id, force: true });
  revalidatePath('/');
  revalidatePath('/chat');
  return r;
}

/** Admins: save the coaches' brief that every Claude feature reads. Empty goes back to the starting version. */
export async function saveCoachBrief(body: string) {
  const { supabase, me } = await requireMember({ admin: true });
  const text = body.replace(/\r\n/g, '\n').trim().slice(0, BRIEF_MAX);
  const reset = !text || text === DEFAULT_COACH_BRIEF.trim();
  const { error } = await supabase
    .from('program')
    .update({ coach_brief: reset ? null : text, coach_brief_at: new Date().toISOString(), coach_brief_by: me.id })
    .eq('id', 1);
  if (error) return { error: 'Couldn’t save the brief. Try again.' };
  revalidatePath('/admin/brief');
  return { ok: true, reset };
}

/** Claude draws a spirit animal from a description. Nothing is saved until they press Save. */
export async function drawAvatar(prompt: string) {
  const { supabase, me } = await requireMember();
  const ask = prompt.trim().replace(/\s+/g, ' ').slice(0, 120);
  if (!ask) return { error: 'Describe your animal first, like “a grumpy beaver”.' };
  if (!aiEnabled()) return { error: 'Claude isn’t set up yet.' };
  if (!(await takeAllowance(supabase, me.id, 'avatar'))) return { error: 'That’s plenty of drawing for today. Pick one and try more tomorrow.' };
  try {
    const r = await drawAnimal(ask);
    return r.ok ? { ok: true as const, message: r.message, drawing: { prompt: ask, name: r.name, svg: r.svg } } : { error: r.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Claude couldn’t draw that. Try again.' };
  }
}

// ---------------- Check-in ----------------

export async function setAttendance(classDate: string, going: boolean) {
  if (!isDate(classDate)) return { error: 'Bad date' };
  const { supabase, me } = await requireMember();
  const { error } = going
    ? await supabase.from('attendance').upsert({ class_date: classDate, user_id: me.id }, { ignoreDuplicates: true })
    : await supabase.from('attendance').delete().eq('class_date', classDate).eq('user_id', me.id);
  if (error) return { error: error.message };
  revalidatePath('/');
  revalidatePath(`/workouts/${classDate}`);
  return { ok: true };
}

// ---------------- Lifts ----------------

export async function logLift(_: unknown, form: FormData) {
  const { supabase, me } = await requireMember();
  const movement_id = Number(form.get('movement_id'));
  const weight = Number(form.get('weight'));
  const reps = Number(form.get('reps') || 1);
  const unknownDate = form.get('unknown_date') === 'on';
  const logged_on = unknownDate ? null : String(form.get('logged_on') || '');
  if (!movement_id || !(weight > 0) || weight >= 2000) return { error: 'Enter a weight.' };
  if (!(reps >= 1 && reps <= 20)) return { error: 'Reps should be between 1 and 20.' };
  if (logged_on !== null && !isDate(logged_on)) return { error: 'Pick a date, or tick “I don’t remember when”.' };
  const { data, error } = await supabase
    .from('lift_logs')
    .insert({ user_id: me.id, movement_id, weight, reps: Math.round(reps), logged_on })
    .select('is_pr')
    .single();
  if (error) return { error: error.message };
  // A new best: Claude draws their spirit animal doing this lift, in the background (once per lift).
  if (data?.is_pr) after(() => ensurePrArt(supabase, { userId: me.id, movementId: movement_id, actorId: me.id }));
  revalidatePath('/lifts');
  revalidatePath('/');
  return { ok: true, isPr: Boolean(data?.is_pr), at: Date.now() };
}

// ---------------- Benchmarks ----------------

export async function logBenchmark(input: {
  benchmark_id: number;
  done_on: string | null; // null = "I don't remember when"
  level: number | null;
  time?: string;
  rounds?: string;
  reps?: string;
  amount?: string;
  capped?: boolean;
  note?: string;
  workout_date?: string | null;
}) {
  const { supabase, me } = await requireMember();
  if (input.done_on !== null && (!isDate(input.done_on) || input.done_on > todayLocal())) return { error: 'Pick a date (not in the future), or tick “I don’t remember when”.' };
  const level = input.level != null && input.level >= 1 && input.level <= 4 ? Math.round(input.level) : null;
  const { data: b } = await supabase.from('benchmarks').select('id, name, score, better, description, sort').eq('id', input.benchmark_id).maybeSingle<Benchmark>();
  if (!b) return { error: 'That benchmark isn’t on the list any more.' };
  const score = readScore(b, input);
  if (!score.ok) return { error: score.error };
  const { data: earlier } = await supabase
    .from('benchmark_results')
    .select('id, benchmark_id, user_id, done_on, level, time_s, rounds, reps, amount, capped, note, workout_date')
    .eq('user_id', me.id)
    .eq('benchmark_id', b.id);
  const row = {
    benchmark_id: b.id,
    user_id: me.id,
    done_on: input.done_on,
    level,
    time_s: score.time_s,
    rounds: score.rounds,
    reps: score.reps,
    amount: score.amount,
    capped: score.capped,
    note: input.note?.trim().slice(0, 200) || null,
    workout_date: input.workout_date && isDate(input.workout_date) ? input.workout_date : null,
  };
  const { error } = await supabase.from('benchmark_results').insert(row);
  if (error) return { error: error.message };
  revalidatePath('/lifts/benchmarks');
  revalidatePath(`/lifts/benchmarks/${b.id}`);
  const first = !(earlier ?? []).some((r) => r.level === level);
  return { ok: true as const, isBest: row.done_on !== null && !first && isNewBest(b, (earlier ?? []) as BenchResult[], row), first };
}

export async function deleteBenchmarkResult(id: number, benchmarkId: number) {
  const { supabase } = await requireMember();
  await supabase.from('benchmark_results').delete().eq('id', id);
  revalidatePath('/lifts/benchmarks');
  revalidatePath(`/lifts/benchmarks/${benchmarkId}`);
}

const SCORES: ScoreType[] = ['time', 'rounds_reps', 'reps', 'distance', 'weight', 'calories'];

export async function addBenchmark(input: { name: string; score: ScoreType; better: 'higher' | 'lower'; description: string }) {
  const { supabase } = await requireMember({ admin: true });
  const name = input.name.trim().replace(/\s+/g, ' ').slice(0, 60);
  if (!name) return { error: 'Give it a name.' };
  if (!SCORES.includes(input.score)) return { error: 'Pick how it’s scored.' };
  const better = input.score === 'time' ? input.better : 'higher';
  const { error } = await supabase
    .from('benchmarks')
    .insert({ name, score: input.score, better, description: input.description.trim().slice(0, 300) || null });
  if (error) return { error: error.code === '23505' ? 'There’s already a benchmark with that name.' : error.message };
  revalidatePath('/lifts/benchmarks');
  return { ok: true };
}

export async function deleteLift(id: number, movementId: number) {
  const { supabase } = await requireMember();
  await supabase.from('lift_logs').delete().eq('id', id);
  revalidatePath('/lifts');
  revalidatePath(`/lifts/${movementId}`);
}

export async function setCheer(liftLogId: number, on: boolean) {
  const { supabase, me } = await requireMember();
  const { error } = on
    ? await supabase.from('cheers').upsert({ lift_log_id: liftLogId, user_id: me.id }, { ignoreDuplicates: true })
    : await supabase.from('cheers').delete().eq('lift_log_id', liftLogId).eq('user_id', me.id);
  if (error) return { error: error.message };
  // No revalidatePath: the button already shows the change, and re-rendering
  // the whole page just to confirm it made every tap wait.
  return { ok: true };
}

// ---------------- Admin: program ----------------

export async function saveProgram(input: { cycle_start: string; cycle_weeks: number; goals: string[] }) {
  const { supabase } = await requireMember({ admin: true });
  if (!isDate(input.cycle_start)) return { error: 'Pick a start date.' };
  const weeks = Math.round(input.cycle_weeks);
  if (weeks < 4 || weeks > 12) return { error: 'Cycles can be 4 to 12 weeks.' };
  const goals = input.goals.map((g) => g.trim().slice(0, 60)).filter(Boolean).slice(0, 8);
  const { error } = await supabase
    .from('program')
    .update({ cycle_start: input.cycle_start, cycle_weeks: weeks, goals, updated_at: new Date().toISOString() })
    .eq('id', 1);
  if (error) return { error: error.message };
  revalidatePath('/admin');
  return { ok: true };
}

// ---------------- Admin: workouts ----------------

export async function saveWorkout(input: {
  class_date: string;
  title: string;
  focus: string;
  why: string;
  parts: Part[];
  status: 'draft' | 'published';
  coach_notes?: string; // undefined = leave the notes untouched
}) {
  const { supabase } = await requireMember({ admin: true });
  if (!isDate(input.class_date)) return { error: 'Bad date' };
  const { title, focus, why } = cleanWorkoutFields(input);
  if (!title) return { error: 'Give the workout a name.' };
  const parts = cleanParts(input.parts);
  if (!parts) return { error: 'Something is wrong with the workout parts.' };
  const { error } = await supabase.from('workouts').upsert(
    {
      class_date: input.class_date,
      title,
      focus,
      why,
      parts,
      status: input.status === 'published' ? 'published' : 'draft',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'class_date' },
  );
  if (error) return { error: error.message };
  // Order matters: the notes row has a foreign key to workouts.class_date, so the
  // workout upsert above must succeed first. Only then do we write or clear the notes.
  let notesError: { message: string } | null = null;
  if (input.coach_notes !== undefined) {
    const body = cleanCoachNotes(input.coach_notes);
    const result = body
      ? await supabase
          .from('workout_coach_notes')
          .upsert({ class_date: input.class_date, body, updated_at: new Date().toISOString() }, { onConflict: 'class_date' })
      : await supabase.from('workout_coach_notes').delete().eq('class_date', input.class_date);
    notesError = result.error;
  }
  // The workout is saved by now, so refresh pages even if the notes write failed.
  revalidatePath('/workouts');
  revalidatePath(`/workouts/${input.class_date}`);
  revalidatePath('/admin');
  revalidatePath('/');
  if (notesError) return { error: 'Workout saved, but the coach notes didn’t save: ' + notesError.message, saved: true };
  return { ok: true };
}

export async function deleteWorkout(classDate: string) {
  const { supabase } = await requireMember({ admin: true });
  await supabase.from('workouts').delete().eq('class_date', classDate);
  revalidatePath('/workouts');
  revalidatePath('/admin');
  redirect('/admin');
}

// ---------------- Admin: members ----------------

export async function setMember(memberId: string, approved: boolean, isAdmin: boolean) {
  const { supabase } = await requireMember({ admin: true });
  const { error } = await supabase.rpc('admin_set_member', { member: memberId, set_approved: approved, set_admin: isAdmin });
  if (error) return { error: error.message };
  revalidatePath('/admin/members');
  return { ok: true };
}

/** Admins: make someone a coach (coach mode, notes, gym clock), or not. */
export async function setCoach(memberId: string, on: boolean) {
  const { supabase } = await requireMember({ admin: true });
  const { error } = await supabase.rpc('admin_set_coach', { member: memberId, on_off: on });
  if (error) return { error: error.message };
  revalidatePath('/admin/members');
  return { ok: true };
}

export async function removeMember(memberId: string) {
  const { supabase } = await requireMember({ admin: true });
  const { error } = await supabase.rpc('admin_remove_member', { member: memberId });
  if (error) return { error: error.message };
  revalidatePath('/admin/members');
  return { ok: true };
}

// ---------------- Claude ----------------

export async function aiDraft(date: string, request: string, current: WorkoutDraft | null) {
  if (!isDate(date)) return { error: 'Bad date' };
  const { supabase, me } = await requireMember({ admin: true });
  if (!aiEnabled()) return { error: 'Claude isn’t set up yet.' };
  if (!(await takeAllowance(supabase, me.id, 'build'))) return { error: 'That’s a lot of drafts for one day. Try again tomorrow.' };
  try {
    const [schedule, weather] = await Promise.all([getSchedule(supabase), classWeather(date)]);
    const draft = await draftWorkout({ supabase, schedule, date, request: request.slice(0, 500), current, weather });
    return { draft };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Claude didn’t answer. Try again.' };
  }
}

/** Drafts one empty day and saves it as a draft (used for "draft the week"). */
export async function aiDraftDay(date: string) {
  if (!isDate(date) || !isWeekday(date)) return { error: 'Bad date' };
  if (date < todayLocal()) return { skipped: true };
  const { supabase, me } = await requireMember({ admin: true });
  if (!aiEnabled()) return { error: 'Claude isn’t set up yet.' };
  const { data: existing } = await supabase.from('workouts').select('id').eq('class_date', date).maybeSingle();
  if (existing) return { skipped: true };
  if (!(await takeAllowance(supabase, me.id, 'build'))) return { error: 'Daily limit reached. Try again tomorrow.' };
  try {
    const [schedule, weather] = await Promise.all([getSchedule(supabase), classWeather(date)]);
    const draft = await draftWorkout({ supabase, schedule, date, request: '', weather });
    const parts = cleanParts(draft.parts);
    if (!parts) return { error: 'Claude’s draft didn’t fit. Try again.' };
    const { error } = await supabase.from('workouts').insert({
      class_date: date,
      title: draft.title || 'Workout',
      focus: draft.focus,
      why: draft.why,
      parts,
      status: 'draft',
    });
    // Someone saved this day while Claude was writing: keep theirs.
    if (error?.code === '23505') return { skipped: true };
    if (error) return { error: error.message };
    revalidatePath('/admin');
    revalidatePath('/workouts');
    return { title: draft.title };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Claude didn’t answer. Try again.' };
  }
}

export async function aiScale(date: string, message: string, outside: boolean) {
  if (!isDate(date)) return { error: 'Bad date' };
  if (!message.trim()) return { error: 'Tell Claude what’s going on first.' };
  const { supabase, me } = await requireMember();
  if (!aiEnabled()) return { error: 'Claude isn’t set up yet.' };
  const { data: w } = await supabase.from('workouts').select('title, parts').eq('class_date', date).maybeSingle();
  if (!w) return { error: 'Workout not found.' };
  if (!(await takeAllowance(supabase, me.id, 'scale'))) return { error: 'You’ve asked a lot today. Check with an admin, or try again tomorrow.' };
  try {
    const [{ bests }, brief] = await Promise.all([getBests(supabase, me.id), getCoachBrief(supabase)]);
    const maxes = Object.fromEntries(bests.map((b) => [b.movement, b.estMax]));
    const advice = await scaleAdvice({ brief: brief.body, workout: { title: w.title, parts: w.parts as Part[] }, level: me.level, outside, maxes, message });
    return { advice };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Claude didn’t answer. Try again.' };
  }
}

// ---------------- Admin: cycle planner ----------------

async function movementNames(supabase: Awaited<ReturnType<typeof requireMember>>['supabase']) {
  const { data } = await supabase.from('movements').select('name').order('sort');
  return (data ?? []).map((m) => m.name as string);
}

export async function aiPlanCycle(start: string, brief: string, current: PlanDraft | null, request: string, editingId: number | null) {
  if (!isDate(start)) return { error: 'Pick a start date.' };
  const { supabase, me } = await requireMember({ admin: true });
  if (!aiEnabled()) return { error: 'Claude isn’t set up yet.' };
  if (!(await takeAllowance(supabase, me.id, 'plan'))) return { error: 'That’s a lot of planning for one day. Try again tomorrow.' };
  try {
    const schedule = await getSchedule(supabase);
    // Plan around every other planned cycle, not the one being edited.
    const others = { ...schedule, cycles: schedule.cycles.filter((c) => c.id !== editingId) };
    const plan = await planCycle({ supabase, schedule: others, start, brief: brief.slice(0, 1500), current, request: request.slice(0, 800) });
    return { plan };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Claude didn’t answer. Try again.' };
  }
}

export async function saveCycle(id: number | null, input: PlanDraft) {
  const { supabase } = await requireMember({ admin: true });
  const { plan, error } = cleanPlan(input, await movementNames(supabase));
  if (!plan) return { error };
  const row = {
    start_date: plan.start_date,
    week_count: plan.weeks.length,
    name: plan.name,
    why: plan.why,
    brief: plan.brief,
    goals: plan.goals,
    weeks: plan.weeks,
    days: plan.days,
    updated_at: new Date().toISOString(),
  };
  const res = id
    ? await supabase.from('cycles').update(row).eq('id', id).select('id').single()
    : await supabase.from('cycles').insert(row).select('id').single();
  if (res.error) {
    if (res.error.code === '23P01') return { error: 'Those dates overlap another planned cycle. Change the start date or the number of weeks.' };
    return { error: res.error.message };
  }
  revalidatePath('/', 'layout');
  return { id: res.data.id as number };
}

export async function deleteCycle(id: number) {
  const { supabase } = await requireMember({ admin: true });
  await supabase.from('cycles').delete().eq('id', id);
  revalidatePath('/', 'layout');
  redirect('/admin/cycles');
}
