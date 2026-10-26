import { addDays, mondayOf } from './dates';

export interface AttendanceRow {
  user_id: string;
  class_date: string;
}

/** How many classes in each week (keyed by its Monday). */
export function weekCounts(dates: string[]) {
  const m = new Map<string, number>();
  for (const d of dates) m.set(mondayOf(d), (m.get(mondayOf(d)) ?? 0) + 1);
  return m;
}

/**
 * Weeks in a row you hit your weekly goal, counting back from this week.
 * This week only counts once you've hit it, and never breaks the streak
 * while it's still going. `doneThrough` is the last class that has happened.
 */
export function goalStreak(dates: string[], goal: number, doneThrough: string) {
  const counts = weekCounts(dates.filter((d) => d <= doneThrough));
  const hit = (w: string) => (counts.get(w) ?? 0) >= goal;
  let week = mondayOf(doneThrough);
  if (!hit(week)) week = addDays(week, -7);
  let n = 0;
  while (hit(week)) {
    n++;
    week = addDays(week, -7);
  }
  return n;
}

/** The longest run of weeks in a row you hit your goal. */
export function bestGoalStreak(dates: string[], goal: number) {
  const weeks = [...weekCounts(dates)].filter(([, n]) => n >= goal).map(([w]) => w).sort();
  let best = 0;
  let run = 0;
  let prev = '';
  for (const w of weeks) {
    run = prev && addDays(prev, 7) === w ? run + 1 : 1;
    best = Math.max(best, run);
    prev = w;
  }
  return best;
}

/** The weeks that count for a month: those starting in it, up to the last class that's happened. */
export function monthWeeks(monthStart: string, doneThrough: string) {
  const weeks: string[] = [];
  let w = mondayOf(monthStart);
  if (w < monthStart) w = addDays(w, 7);
  for (; w <= doneThrough && w.slice(0, 7) === monthStart.slice(0, 7); w = addDays(w, 7)) weeks.push(w);
  return weeks;
}

export type WeekResult = 'hit' | 'missed' | 'open';

export interface BoardRow {
  user_id: string;
  goal: number;
  /** Weeks this month you hit your goal. */
  hits: number;
  /** Each week of the month so far: hit your goal, missed it, or still going. */
  weeks: WeekResult[];
  classes: number;
  streak: number;
  /** 1-based; people tied share a rank. */
  rank: number;
}

/**
 * Everyone against their own weekly goal. Ranked by weeks hit this month,
 * so someone who comes twice a week and never misses ranks with the
 * five-a-week regulars.
 */
export function goalBoard(rows: AttendanceRow[], goals: Record<string, number>, monthStart: string, doneThrough: string): BoardRow[] {
  const weeks = monthWeeks(monthStart, doneThrough);
  const byUser = new Map<string, string[]>();
  for (const r of rows) {
    if (r.class_date > doneThrough) continue;
    byUser.set(r.user_id, [...(byUser.get(r.user_id) ?? []), r.class_date]);
  }
  // Only people who've set a weekly goal are on the board.
  const list = [...byUser]
    .filter(([user_id]) => goals[user_id] != null)
    .map(([user_id, dates]) => {
      const goal = goals[user_id];
      const counts = weekCounts(dates);
      const hitWeeks = weeks.filter((w) => (counts.get(w) ?? 0) >= goal);
      const classes = dates.filter((d) => weeks.includes(mondayOf(d))).length;
      const results = weeks.map((w): WeekResult => (hitWeeks.includes(w) ? 'hit' : addDays(w, 4) <= doneThrough ? 'missed' : 'open'));
      return { user_id, goal, hits: hitWeeks.length, weeks: results, classes, streak: goalStreak(dates, goal, doneThrough), rank: 0 };
    })
    .filter((r) => r.classes > 0)
    .sort((a, b) => b.hits - a.hits || b.streak - a.streak || a.user_id.localeCompare(b.user_id));
  list.forEach((r, i) => {
    r.rank = i > 0 && r.hits === list[i - 1].hits ? list[i - 1].rank : i + 1;
  });
  return list;
}

export type DayMark = 'in' | 'missed' | 'none' | 'ahead';

/** The last `weeks` weeks, Monday to Friday, oldest first, for the little calendar. */
export function recentWeeks(mine: Set<string>, held: Set<string>, doneThrough: string, weeks = 8) {
  const start = addDays(mondayOf(doneThrough), -7 * (weeks - 1));
  return Array.from({ length: weeks }, (_, w) => {
    const monday = addDays(start, w * 7);
    return {
      monday,
      days: [0, 1, 2, 3, 4].map((n) => {
        const date = addDays(monday, n);
        const mark: DayMark = date > doneThrough ? 'ahead' : mine.has(date) ? 'in' : held.has(date) ? 'missed' : 'none';
        return { date, mark };
      }),
    };
  });
}

/** Class milestones: 10, 25, 50, 75, 100, then every 50 to 500, then every 100 (matches the database). */
export function nextMilestone(n: number) {
  if (n < 10) return { prev: 0, next: 10 };
  if (n < 25) return { prev: 10, next: 25 };
  if (n < 50) return { prev: 25, next: 50 };
  if (n < 75) return { prev: 50, next: 75 };
  if (n < 100) return { prev: 75, next: 100 };
  if (n < 500) return { prev: Math.floor(n / 50) * 50, next: Math.floor(n / 50) * 50 + 50 };
  return { prev: Math.floor(n / 100) * 100, next: Math.floor(n / 100) * 100 + 100 };
}
