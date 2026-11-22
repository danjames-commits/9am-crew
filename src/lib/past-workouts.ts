import { addDays, mondayOf } from './dates';
import type { BenchResult } from './benchmarks';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Which weeks one page of past workouts shows, newest first. The first page ends at the
 * week of the last class that's over; `before` (a Monday from the previous page's
 * "Show earlier") moves back a page. Anything odd in `before` gives the first page.
 */
export function pastWindow({
  before,
  lastDone,
  earliest,
  weeks = 4,
}: {
  before?: string | null;
  lastDone: string;
  earliest: string | null;
  weeks?: number;
}) {
  if (!earliest) return { mondays: [] as string[], from: null, to: null, earlier: null };
  const top = mondayOf(lastDone);
  const floor = mondayOf(earliest);
  let newest = top;
  if (before && DATE.test(before) && !Number.isNaN(Date.parse(before + 'T12:00:00Z')) && mondayOf(before) === before) {
    const wanted = addDays(before, -7);
    if (wanted <= top && wanted >= floor) newest = wanted;
  }
  const mondays: string[] = [];
  for (let m = newest; m >= floor && mondays.length < weeks; m = addDays(m, -7)) mondays.push(m);
  const oldest = mondays[mondays.length - 1];
  const friday = addDays(newest, 4);
  return {
    mondays,
    from: oldest,
    to: friday < lastDone ? friday : lastDone,
    earlier: oldest > floor ? oldest : null,
  };
}

/** Rows grouped into the given weeks (newest first), days in order, empty weeks dropped. */
export function groupByWeek<T extends { class_date: string }>(rows: T[], mondays: string[]) {
  return mondays
    .map((monday) => ({
      monday,
      days: rows.filter((r) => mondayOf(r.class_date) === monday).sort((a, b) => (a.class_date < b.class_date ? -1 : 1)),
    }))
    .filter((w) => w.days.length > 0);
}

/** Your lift logs from that day. Undated logs ("I don't remember when") never match. */
export function liftsOn<T extends { logged_on: string | null }>(logs: T[], date: string) {
  return logs.filter((l) => l.logged_on === date);
}

/** Your benchmark results for that day's workout: the workout it was logged against, else the day it was done. */
export function benchOn<T extends Pick<BenchResult, 'done_on' | 'workout_date'>>(results: T[], date: string) {
  return results.filter((r) => (r.workout_date ?? r.done_on) === date);
}
