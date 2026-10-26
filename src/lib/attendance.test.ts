import { describe, expect, it } from 'vitest';
import { bestGoalStreak, goalBoard, goalStreak, monthWeeks, recentWeeks } from './attendance';

// 2026-10-19 is a Monday.
describe('goalStreak', () => {
  it('counts weeks in a row you hit your goal', () => {
    const d = ['2026-10-05', '2026-10-07', '2026-10-12', '2026-10-14'];
    expect(goalStreak(d, 2, '2026-10-16')).toBe(2);
    expect(goalStreak(d, 3, '2026-10-16')).toBe(0);
  });
  it("doesn't break while this week is still going", () => {
    expect(goalStreak(['2026-10-12', '2026-10-14', '2026-10-19'], 2, '2026-10-20')).toBe(1);
  });
  it('counts this week once hit', () => {
    expect(goalStreak(['2026-10-12', '2026-10-14', '2026-10-19', '2026-10-20'], 2, '2026-10-20')).toBe(2);
  });
  it('ignores classes that have not happened yet', () => {
    expect(goalStreak(['2026-10-19', '2026-10-21'], 2, '2026-10-20')).toBe(0);
  });
});

describe('bestGoalStreak', () => {
  it('finds the longest run of goal weeks', () => {
    expect(bestGoalStreak(['2026-09-01', '2026-09-08', '2026-09-15', '2026-10-06'], 1)).toBe(3);
    expect(bestGoalStreak([], 1)).toBe(0);
  });
});

describe('monthWeeks', () => {
  it('takes weeks starting in the month, up to the last class', () => {
    expect(monthWeeks('2026-10-01', '2026-10-20')).toEqual(['2026-10-05', '2026-10-12', '2026-10-19']);
  });
});

describe('goalBoard', () => {
  // Weeks of Oct 5 and Oct 12 are finished; Oct 19 week is under way (last class Tue Oct 20).
  const rows = [
    // Five-a-week regular, misses the goal once.
    ...['05', '06', '07', '08', '09', '12', '13', '14', '15', '19', '20'].map((d) => ({ user_id: 'reg', class_date: `2026-10-${d}` })),
    // Twice a week, never misses.
    ...['05', '08', '13', '15', '19', '20'].map((d) => ({ user_id: 'two', class_date: `2026-10-${d}` })),
    // Signed up for Thursday: not counted yet.
    { user_id: 'two', class_date: '2026-10-22' },
  ];
  it('ranks by weeks you hit your own goal, not by how often you come', () => {
    const b = goalBoard(rows, { reg: 5, two: 2 }, '2026-10-01', '2026-10-20');
    expect(b.map((r) => [r.user_id, r.hits, r.weeks, r.rank])).toEqual([
      ['two', 3, ['hit', 'hit', 'hit'], 1],
      ['reg', 1, ['hit', 'missed', 'open'], 2],
    ]);
    expect(b.find((r) => r.user_id === 'two')!.classes).toBe(6);
  });
  it('leaves off people who have not set a goal', () => {
    expect(goalBoard(rows, {}, '2026-10-01', '2026-10-20')).toEqual([]);
  });
});

describe('recentWeeks', () => {
  it('marks in, missed, no class and ahead', () => {
    const w = recentWeeks(new Set(['2026-10-19', '2026-10-22']), new Set(['2026-10-19', '2026-10-20']), '2026-10-21', 1);
    expect(w[0].days.map((d) => d.mark)).toEqual(['in', 'missed', 'none', 'ahead', 'ahead']);
  });
});
