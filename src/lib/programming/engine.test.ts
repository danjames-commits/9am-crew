import { describe, expect, it } from 'vitest';
import { cyclePlan, cyclePosition, suggestWorkout, estimateMax, weightFor, conditioningOptions } from './engine';
import { classDays, nextClassDate, addDays } from '../dates';

describe('cycle', () => {
  it('6 weeks: three build weeks, ease off, heavy, test', () => {
    const plan = cyclePlan(6);
    expect(plan.map((w) => w.kind)).toEqual(['build', 'build', 'build', 'deload', 'build', 'test']);
    expect(plan.map((w) => w.pct)).toEqual([65, 71, 76, 60, 82, 0]);
    expect(plan.map((w) => `${w.sets}x${w.reps}`).slice(0, 5)).toEqual(['3x8', '4x6', '5x5', '3x5', '5x3']);
  });

  it('works for other lengths', () => {
    for (let n = 4; n <= 12; n++) {
      const plan = cyclePlan(n);
      expect(plan).toHaveLength(n);
      expect(plan[n - 1].kind).toBe('test');
      const builds = plan.filter((w) => w.kind === 'build').map((w) => w.pct);
      expect([...builds].sort((a, b) => a - b)).toEqual(builds); // only goes up
    }
  });

  it('finds the week and cycle for a date', () => {
    expect(cyclePosition('2026-10-23', '2026-10-05', 6)).toMatchObject({ cycle: 1, week: { index: 2 } });
    expect(cyclePosition('2026-11-16', '2026-10-05', 6)).toMatchObject({ cycle: 2, week: { index: 0 } });
    expect(cyclePosition('2026-10-01', '2026-10-05', 6).started).toBe(false);
  });
});

describe('suggested workouts', () => {
  const base = { cycleStart: '2026-10-05', cycleWeeks: 6 };

  it('builds every weekday for a whole cycle with four levels each', () => {
    for (const d of classDays('2026-10-05', 30)) {
      const w = suggestWorkout({ ...base, date: d });
      expect(w.parts.length).toBeGreaterThanOrEqual(3);
      for (const p of w.parts) {
        expect(p.versions).toHaveLength(4);
        p.versions.forEach((v) => expect(v.trim().length).toBeGreaterThan(5));
      }
    }
  });

  it('Friday squat week 3 matches the plan', () => {
    const w = suggestWorkout({ ...base, date: '2026-10-23' });
    const s = w.parts.find((p) => p.kind === 'strength')!;
    expect(s.title).toBe('Back squat 5×5');
    expect(s.lift!.pct).toEqual([null, 66, 76, 81]);
    expect(s.versions[0]).toMatch(/Goblet squat/);
    expect(w.why).toMatch(/4×6 @ 71%/);
  });

  it('Thursday has no heavy lifting', () => {
    const w = suggestWorkout({ ...base, date: '2026-10-22' });
    expect(w.parts.some((p) => p.kind === 'strength')).toBe(false);
    expect(w.focus).toMatch(/Easy/);
  });

  it('swap steps through options and wraps around', () => {
    const d = '2026-10-23';
    const n = conditioningOptions(d).length;
    const names = Array.from({ length: n + 1 }, (_, i) => suggestWorkout({ ...base, date: d, swap: i }).parts.find((p) => p.kind === 'conditioning')!.title);
    expect(new Set(names.slice(0, n)).size).toBe(n);
    expect(names[n]).toBe(names[0]);
  });

  it('conditioning rotates week to week', () => {
    const a = suggestWorkout({ ...base, date: '2026-10-23' }).title;
    const b = suggestWorkout({ ...base, date: addDays('2026-10-23', 7) }).title;
    expect(a).not.toBe(b);
  });

  it('adjusting changes every level', () => {
    const w = suggestWorkout({ ...base, date: '2026-10-23', adjust: 5 });
    expect(w.parts.find((p) => p.kind === 'strength')!.lift!.pct).toEqual([null, 71, 81, 86]);
  });

  it('test week asks for a new best', () => {
    const w = suggestWorkout({ ...base, date: '2026-11-13' });
    expect(w.parts.find((p) => p.kind === 'strength')!.label).toMatch(/test/);
  });

  it('refuses weekends', () => {
    expect(() => suggestWorkout({ ...base, date: '2026-10-17' })).toThrow();
  });
});

describe('member weights', () => {
  it('estimates best and rounds to 5 lb', () => {
    expect(estimateMax(205, 1)).toBe(205);
    expect(Math.round(estimateMax(150, 5))).toBe(175);
    expect(weightFor(205, 76)).toBe(155);
    expect(weightFor(undefined, 76)).toBeNull();
    expect(weightFor(205, null)).toBeNull();
  });
});

describe('next class', () => {
  it('today before 10am on a weekday, otherwise next weekday', () => {
    // 2026-10-15 is a Thursday. Halifax is UTC-3.
    expect(nextClassDate(new Date('2026-10-15T11:30:00Z'))).toBe('2026-10-15'); // 8:30 local
    expect(nextClassDate(new Date('2026-10-15T14:00:00Z'))).toBe('2026-10-16'); // 11:00 local
    expect(nextClassDate(new Date('2026-10-16T22:00:00Z'))).toBe('2026-10-19'); // Fri evening → Mon
    expect(nextClassDate(new Date('2026-10-18T12:00:00Z'))).toBe('2026-10-19'); // Sunday
  });
});

import { setPlan, aimRange } from './engine';

describe('your numbers', () => {
  it('lays out warm-ups and work sets in your own pounds', () => {
    expect(setPlan(155, 5, 5)).toEqual([
      { label: 'Warm-up', weight: 60, reps: 5, sets: 1 },
      { label: 'Warm-up', weight: 95, reps: 3, sets: 1 },
      { label: 'Warm-up', weight: 125, reps: 2, sets: 1 },
      { label: 'Work', weight: 155, reps: 5, sets: 5 },
    ]);
  });
  it('light work weights start from the empty bar', () => {
    const plan = setPlan(65, 3, 8);
    expect(plan[0]).toEqual({ label: 'Warm-up', weight: null, reps: 5, sets: 1 });
    expect(plan[plan.length - 1]).toEqual({ label: 'Work', weight: 65, reps: 8, sets: 3 });
  });
  it('find-your-5 days suggest a sensible range', () => {
    expect(aimRange(205, 5)).toEqual({ low: 155, high: 170 });
  });
  it('suggested workouts carry sets, reps and the Gentle movement', () => {
    const s = suggestWorkout({ cycleStart: '2026-10-19', cycleWeeks: 6, date: '2026-10-30' }).parts.find((p) => p.kind === 'strength')!;
    expect(s.lift).toMatchObject({ movement: 'Back squat', sets: 4, reps: 6, gentleMovement: 'Goblet squat' });
  });
});

import { liftPart, liftPct } from './engine';

describe('lift settings write the words', () => {
  it('percent lifts: text, title and numbers come from one place', () => {
    const p = liftPart({ movement: 'Deadlift', gentleMovement: 'Kettlebell deadlift', mode: 'percent', sets: 3, reps: 5, pct: liftPct(80), note: 'Brace before every rep' });
    expect(p.title).toBe('Deadlift 3×5');
    expect(p.lift!.pct).toEqual([null, 70, 80, 85]);
    expect(p.versions[0]).toBe('Kettlebell deadlift 3×8, a weight you could lift about 12 times\nBrace before every rep');
    expect(p.versions[2]).toBe('Deadlift 3×5 @ 80%\nBrace before every rep');
  });
  it('build-to-a-set lifts', () => {
    const p = liftPart({ movement: 'Front squat', gentleMovement: 'Goblet squat', mode: 'build', reps: 3, pct: [null, null, null, null] });
    expect(p.title).toBe('Front squat: find your 3');
    expect(p.versions[1]).toMatch(/^Front squat: build over 5 sets to a solid set of 3/);
    expect(p.versions[0]).toMatch(/^Goblet squat: 4 × 10/);
  });
  it('the planned strength part still reads the same', () => {
    const s = suggestWorkout({ cycleStart: '2026-10-05', cycleWeeks: 6, date: '2026-10-23' }).parts.find((p) => p.kind === 'strength')!;
    expect(s.versions[2]).toBe('Back squat 5×5 @ 76%');
    expect(s.lift!.mode).toBe('percent');
  });
});
