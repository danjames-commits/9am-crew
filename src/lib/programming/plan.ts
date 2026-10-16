// A cycle plan as it's edited in the planner and saved to the database.
// Pure functions, shared by the planner screen and the server.
import { isWeekday, weekday } from '../dates';
import { builtInDays, cyclePlan, GENTLE_FOR, STYLES, type CycleDay, type CycleWeek, type WeekKind, type WeekPlan } from './engine';

export interface PlanDraft {
  start_date: string;
  name: string;
  why: string;
  brief: string;
  goals: string[];
  weeks: CycleWeek[];
  days: Record<string, CycleDay>;
}

export const WEEKDAYS: { n: string; short: string; long: string }[] = [
  { n: '1', short: 'Mon', long: 'Monday' },
  { n: '2', short: 'Tue', long: 'Tuesday' },
  { n: '3', short: 'Wed', long: 'Wednesday' },
  { n: '4', short: 'Thu', long: 'Thursday' },
  { n: '5', short: 'Fri', long: 'Friday' },
];

export const KIND_NAMES: Record<WeekKind, string> = { build: 'Build', deload: 'Ease off', test: 'Test' };

/** A starting point for hand-planning: the built-in pattern. */
export function builtInPlan(start: string, goals: string[] = [], weeks = 6): PlanDraft {
  return {
    start_date: start,
    name: '',
    why: '',
    brief: '',
    goals,
    weeks: cyclePlan(weeks).map(({ kind, label, pct, sets, reps }) => ({ kind, label, pct, sets, reps })),
    days: builtInDays(),
  };
}

/** Weeks in the shape the chart and engine use. */
export function asWeekPlans(weeks: CycleWeek[]): WeekPlan[] {
  return weeks.map((w, index) => ({ index, ...w, pct: w.kind === 'test' ? 0 : w.pct, sets: w.kind === 'test' ? 0 : w.sets }));
}

const int = (v: unknown, lo: number, hi: number, d: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d;
};
const text = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);

export function cleanWeek(w: Partial<CycleWeek>): CycleWeek {
  const kind: WeekKind = w.kind === 'deload' || w.kind === 'test' ? w.kind : 'build';
  if (kind === 'test') return { kind, label: text(w.label, 20) || 'Test', pct: 0, sets: 0, reps: int(w.reps, 1, 5, 3) };
  if (kind === 'deload') return { kind, label: text(w.label, 20) || 'Ease off', pct: int(w.pct, 50, 75, 60), sets: int(w.sets, 1, 8, 3), reps: int(w.reps, 1, 12, 5) };
  return { kind, label: text(w.label, 20) || 'Build', pct: int(w.pct, 50, 90, 70), sets: int(w.sets, 1, 8, 5), reps: int(w.reps, 1, 12, 5) };
}

export function cleanDay(d: Partial<CycleDay> | undefined, movements: string[], fallback: CycleDay): CycleDay {
  if (!d) return fallback;
  const lift = d.lift && movements.includes(d.lift) ? d.lift : null;
  const gentle = lift ? (d.gentle && movements.includes(d.gentle) ? d.gentle : GENTLE_FOR[lift] ?? lift) : null;
  return {
    focus: text(d.focus, 60) || fallback.focus,
    style: STYLES.includes(d.style as never) ? (d.style as CycleDay['style']) : fallback.style,
    lift,
    gentle,
    skill: d.skill === 'pullup' ? 'pullup' : null,
    notes: text(d.notes, 200),
  };
}

/** Checks and tidies a plan before it's saved. Returns an error message for anything an admin needs to fix. */
export function cleanPlan(p: PlanDraft, movements: string[]): { plan?: PlanDraft; error?: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.start_date ?? '') || !isWeekday(p.start_date) || weekday(p.start_date) !== 1)
    return { error: 'The cycle has to start on a Monday.' };
  if (!Array.isArray(p.weeks) || p.weeks.length < 3 || p.weeks.length > 12) return { error: 'A cycle needs 3 to 12 weeks.' };
  const fallback = builtInDays();
  const days: Record<string, CycleDay> = {};
  for (const { n } of WEEKDAYS) days[n] = cleanDay(p.days?.[n], movements, fallback[n]);
  return {
    plan: {
      start_date: p.start_date,
      name: text(p.name, 80),
      why: text(p.why, 1500),
      brief: text(p.brief, 1500),
      goals: (Array.isArray(p.goals) ? p.goals : []).map((g) => text(g, 60)).filter(Boolean).slice(0, 8),
      weeks: p.weeks.map(cleanWeek),
      days,
    },
  };
}
