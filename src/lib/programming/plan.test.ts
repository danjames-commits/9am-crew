import { describe, expect, it } from 'vitest';
import { builtInPlan, cleanPlan, asWeekPlans } from './plan';
import { positionOn, suggestWorkout, type SavedCycle } from './engine';

const MOVES = ['Back squat', 'Front squat', 'Deadlift', 'Bench press', 'Strict press', 'Push press', 'Power clean', 'Snatch', 'Squat clean & jerk'];

describe('cycle plans', () => {
  it('a hand-made plan starts from the usual pattern', () => {
    const p = builtInPlan('2026-11-30', ['Row 2 km']);
    expect(p.weeks.map((w) => w.kind)).toEqual(['build', 'build', 'build', 'deload', 'build', 'test']);
    expect(p.days['1']).toMatchObject({ lift: 'Strict press', gentle: 'Dumbbell press', style: 'amrap' });
    expect(cleanPlan(p, MOVES).plan).toBeTruthy();
  });

  it('must start on a Monday and have 3 to 12 weeks', () => {
    const p = builtInPlan('2026-11-30');
    expect(cleanPlan({ ...p, start_date: '2026-12-01' }, MOVES).error).toMatch(/Monday/);
    expect(cleanPlan({ ...p, weeks: p.weeks.slice(0, 2) }, MOVES).error).toMatch(/3 to 12/);
  });

  it('tidies numbers, unknown lifts and missing days', () => {
    const p = builtInPlan('2026-11-30');
    const messy = {
      ...p,
      weeks: [
        { kind: 'build' as const, label: '', pct: 140, sets: 0, reps: 99 },
        { kind: 'deload' as const, label: 'Holidays', pct: 30, sets: 3, reps: 5 },
        { kind: 'test' as const, label: 'Test', pct: 85, sets: 5, reps: 1 },
      ],
      days: { ...p.days, '2': { ...p.days['2'], lift: 'Turkish get-up', style: 'yoga' as never }, '5': undefined as never },
      goals: ['  First pull-up  ', '', 'x'.repeat(100)],
    };
    const { plan } = cleanPlan(messy, MOVES);
    expect(plan!.weeks).toEqual([
      { kind: 'build', label: 'Build', pct: 90, sets: 1, reps: 12 },
      { kind: 'deload', label: 'Holidays', pct: 50, sets: 3, reps: 5 },
      { kind: 'test', label: 'Test', pct: 0, sets: 0, reps: 1 },
    ]);
    expect(plan!.days['2']).toMatchObject({ lift: null, gentle: null, style: 'intervals' });
    expect(plan!.days['5']).toMatchObject({ lift: 'Back squat', style: 'short' });
    expect(plan!.goals).toEqual(['First pull-up', 'x'.repeat(60)]);
  });

  it('a saved plan drives the chart and the suggestions', () => {
    const { plan } = cleanPlan({ ...builtInPlan('2026-11-30'), name: 'Front squat focus', days: { ...builtInPlan('2026-11-30').days, '5': { focus: 'Front squat', style: 'short', lift: 'Front squat', gentle: null, skill: null } } }, MOVES);
    const saved: SavedCycle = { id: 9, ...plan! };
    const schedule = { cycleStart: '2026-10-19', cycleWeeks: 6, goals: [], cycles: [saved] };
    expect(asWeekPlans(saved.weeks)).toHaveLength(6);
    const fri = suggestWorkout({ date: '2026-12-04', schedule }).parts.find((p) => p.kind === 'strength')!;
    expect(fri.lift).toMatchObject({ movement: 'Front squat', gentleMovement: 'Goblet squat' });
    expect(positionOn('2026-12-04', schedule).resolved.name).toBe('Front squat focus');
  });
});

describe('Gentle movements are not tracked lifts', () => {
  it('Gentle can still do an easier movement that isn’t on the lift list', () => {
    const p = builtInPlan('2026-11-30');
    const { plan } = cleanPlan({ ...p, days: { ...p.days, '3': { focus: 'Snatch', style: 'short', lift: 'Snatch', gentle: null, skill: null } } }, MOVES);
    expect(plan!.days['1'].gentle).toBe('Dumbbell press');
    expect(plan!.days['3']).toMatchObject({ lift: 'Snatch', gentle: 'Dumbbell snatch' });
  });
});
