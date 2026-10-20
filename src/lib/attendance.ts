import { addDays, mondayOf } from './dates';

export interface AttendanceRow {
  user_id: string;
  class_date: string;
}

/**
 * Weeks in a row with at least one class, counting back from this week.
 * A week that hasn't had your class yet doesn't break the streak: it just
 * isn't counted until you show up.
 */
export function weekStreak(dates: string[], today: string) {
  const weeks = new Set(dates.filter((d) => d <= today).map(mondayOf));
  let week = mondayOf(today);
  if (!weeks.has(week)) week = addDays(week, -7);
  let n = 0;
  while (weeks.has(week)) {
    n++;
    week = addDays(week, -7);
  }
  return n;
}

/** The longest run of weeks in a row with at least one class. */
export function bestWeekStreak(dates: string[]) {
  const weeks = [...new Set(dates.map(mondayOf))].sort();
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

export interface BoardRow {
  user_id: string;
  count: number;
  /** 1-based; people tied share a rank. */
  rank: number;
}

/** Classes per person between two dates (inclusive), most first. Ties share a rank. */
export function leaderboard(rows: AttendanceRow[], from: string, to: string): BoardRow[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    if (r.class_date >= from && r.class_date <= to) counts.set(r.user_id, (counts.get(r.user_id) ?? 0) + 1);
  }
  const sorted = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  let rank = 0;
  return sorted.map(([user_id, count], i) => {
    if (i === 0 || count < sorted[i - 1][1]) rank = i + 1;
    return { user_id, count, rank };
  });
}

export type DayMark = 'in' | 'missed' | 'none' | 'ahead';

/** The last `weeks` weeks, Monday to Friday, oldest first, for the little calendar. */
export function recentWeeks(mine: Set<string>, held: Set<string>, today: string, weeks = 8) {
  const start = addDays(mondayOf(today), -7 * (weeks - 1));
  return Array.from({ length: weeks }, (_, w) => {
    const monday = addDays(start, w * 7);
    return {
      monday,
      days: [0, 1, 2, 3, 4].map((n) => {
        const date = addDays(monday, n);
        const mark: DayMark = mine.has(date) ? 'in' : date > today ? 'ahead' : held.has(date) ? 'missed' : 'none';
        return { date, mark };
      }),
    };
  });
}
