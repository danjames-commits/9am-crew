// Pure shaping for the MCP read tools (no database access here).
import { classDays, daysBetween, weekday } from '../dates';
import type { Part } from '../types';

export const MAX_RANGE_DAYS = 70;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const isRealDate = (d: string) => DATE_RE.test(d) && !Number.isNaN(Date.parse(d + 'T12:00:00Z')) && new Date(d + 'T12:00:00Z').toISOString().slice(0, 10) === d;

/** An error message for a bad range, or null if it's fine. */
export function checkRange(from: string, to: string): string | null {
  if (!isRealDate(from) || !isRealDate(to)) return 'Dates must be real YYYY-MM-DD dates.';
  if (to < from) return '"to" must not be before "from".';
  if (daysBetween(from, to) + 1 > MAX_RANGE_DAYS) return `Range is too long: ask for at most ${MAX_RANGE_DAYS} days at a time.`;
  return null;
}

// end_date is exclusive: cycles store daterange(start_date, end_date), which is [start, end).
export type CycleSpan = { id: number; name: string; start_date: string; end_date: string };

export type WorkoutRow = {
  class_date: string;
  title: string;
  focus: string;
  why: string;
  parts: Part[];
  status: 'draft' | 'published';
  updated_at: string;
};

export type DayView = {
  date: string;
  weekday: string;
  exists: boolean;
  editable: boolean;
  cycle: { id: number; name: string } | null;
  title?: string;
  focus?: string;
  why?: string;
  status?: 'draft' | 'published';
  parts?: Part[];
  coach_notes?: string | null;
  updated_at?: string;
};

export function dayView(row: WorkoutRow | null, date: string, note: string | null, cycles: CycleSpan[], today: string): DayView {
  const c = cycles.find((x) => x.start_date <= date && date < x.end_date);
  const base: DayView = {
    date,
    weekday: NAMES[weekday(date)],
    exists: !!row,
    editable: date > today,
    cycle: c ? { id: c.id, name: c.name } : null,
  };
  if (!row) return base;
  return { ...base, title: row.title, focus: row.focus, why: row.why, status: row.status, parts: row.parts, coach_notes: note, updated_at: row.updated_at };
}

/** Every class day (Mon–Fri) from..to inclusive. */
export function weekdaysBetween(from: string, to: string): string[] {
  const all = classDays(from, MAX_RANGE_DAYS + 1);
  return all.filter((d) => d <= to);
}
