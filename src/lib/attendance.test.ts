import { describe, expect, it } from 'vitest';
import { bestWeekStreak, leaderboard, recentWeeks, weekStreak } from './attendance';

// 2026-10-19 is a Monday.
describe('weekStreak', () => {
  it('counts weeks in a row back from this week', () => {
    expect(weekStreak(['2026-10-20', '2026-10-14', '2026-10-06'], '2026-10-21')).toBe(3);
  });
  it("doesn't break before you've come this week", () => {
    expect(weekStreak(['2026-10-14', '2026-10-06'], '2026-10-19')).toBe(2);
  });
  it('stops at a week with no class', () => {
    expect(weekStreak(['2026-10-20', '2026-10-06'], '2026-10-21')).toBe(1);
  });
  it('ignores days still ahead', () => {
    expect(weekStreak(['2026-10-23'], '2026-10-20')).toBe(0);
  });
});

describe('bestWeekStreak', () => {
  it('finds the longest run', () => {
    expect(bestWeekStreak(['2026-09-01', '2026-09-08', '2026-09-15', '2026-10-06', '2026-10-13'])).toBe(3);
    expect(bestWeekStreak([])).toBe(0);
  });
});

describe('leaderboard', () => {
  const rows = [
    { user_id: 'a', class_date: '2026-10-01' },
    { user_id: 'a', class_date: '2026-10-02' },
    { user_id: 'b', class_date: '2026-10-01' },
    { user_id: 'b', class_date: '2026-10-05' },
    { user_id: 'c', class_date: '2026-10-05' },
    { user_id: 'c', class_date: '2026-09-30' },
  ];
  it('ranks by classes in the window, ties share a rank', () => {
    expect(leaderboard(rows, '2026-10-01', '2026-10-31')).toEqual([
      { user_id: 'a', count: 2, rank: 1 },
      { user_id: 'b', count: 2, rank: 1 },
      { user_id: 'c', count: 1, rank: 3 },
    ]);
  });
});

describe('recentWeeks', () => {
  it('marks in, missed, no class and ahead', () => {
    const w = recentWeeks(new Set(['2026-10-19']), new Set(['2026-10-19', '2026-10-20']), '2026-10-21', 1);
    expect(w[0].days.map((d) => d.mark)).toEqual(['in', 'missed', 'none', 'ahead', 'ahead']);
  });
});
