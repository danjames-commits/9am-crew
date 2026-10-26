// Loads what validateChanges needs to check a batch: only the days and cycles it touches.
// Dates that aren't real are left out here; validateChanges explains them.
import { todayLocal } from '../dates';
import type { McpCaller } from './auth';
import type { Change, ChangeContext, CycleRow, DayRow } from './changes';
import { isRealDate } from './read';

type WorkoutRow = DayRow & { id: number; class_date: string; updated_at: string };
type NotesRow = { class_date: string; body: string; updated_at: string };
type CycleDbRow = CycleRow & { id: number; updated_at: string };

const empty = { data: [], error: null };

export async function loadContext({ supabase }: McpCaller, changes: Change[]): Promise<ChangeContext> {
  const dates = [...new Set(changes.flatMap((c) => ('date' in c && typeof c.date === 'string' && isRealDate(c.date) ? [c.date] : [])))];
  const ids = [...new Set(changes.flatMap((c) => ('id' in c && typeof c.id === 'number' ? [c.id] : [])))];

  const [w, n, m, cy] = await Promise.all([
    dates.length ? supabase.from('workouts').select('class_date, id, title, focus, why, parts, status, updated_at').in('class_date', dates) : empty,
    dates.length ? supabase.from('workout_coach_notes').select('class_date, body, updated_at').in('class_date', dates) : empty,
    supabase.from('movements').select('name').order('sort'),
    ids.length ? supabase.from('cycles').select('id, start_date, updated_at, name, why, brief, goals, weeks, days, week_count').in('id', ids) : empty,
  ]);
  const failed = w.error ?? n.error ?? m.error ?? cy.error;
  if (failed) throw new Error(failed.message);
  const workouts = (w.data ?? []) as WorkoutRow[];

  const dateOf = new Map(workouts.map((r) => [r.id, r.class_date]));
  const commentCounts: Record<string, number> = {};
  if (dateOf.size) {
    const { data, error } = await supabase.from('comments').select('workout_id').in('workout_id', [...dateOf.keys()]);
    if (error) throw new Error(error.message);
    for (const { workout_id } of (data ?? []) as { workout_id: number }[]) {
      const d = dateOf.get(workout_id);
      if (d) commentCounts[d] = (commentCounts[d] ?? 0) + 1;
    }
  }

  const ctx: ChangeContext = {
    today: todayLocal(),
    lifts: ((m.data ?? []) as { name: string }[]).map((r) => r.name),
    days: {},
    notes: {},
    commentCounts,
    cycles: {},
  };
  for (const r of workouts) ctx.days[r.class_date] = { title: r.title, focus: r.focus, why: r.why, parts: r.parts, status: r.status, updated_at: r.updated_at };
  for (const r of (n.data ?? []) as NotesRow[]) ctx.notes[r.class_date] = { body: r.body, updated_at: r.updated_at };
  for (const r of (cy.data ?? []) as CycleDbRow[]) {
    ctx.cycles[r.id] = {
      start_date: r.start_date,
      updated_at: r.updated_at,
      row: { start_date: r.start_date, week_count: r.week_count, name: r.name, why: r.why, brief: r.brief, goals: r.goals, weeks: r.weeks, days: r.days },
    };
  }
  return ctx;
}
