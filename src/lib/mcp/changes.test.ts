import { describe, expect, it } from 'vitest';
import { builtInPlan } from '../programming/plan';
import type { Part } from '../types';
import { validateChanges, type ChangeContext, type CycleRow } from './changes';
import { previewText } from './diff';

const MOVES = ['Back squat', 'Front squat', 'Deadlift', 'Bench press', 'Strict press', 'Push press', 'Power clean', 'Snatch', 'Squat clean & jerk'];
const TODAY = '2026-10-26';

const squat: Part = {
  kind: 'strength',
  label: 'Strength',
  title: 'Back squat 5×5',
  versions: ['Goblet squat 5×5', 'Back squat 5×5 @ 60%', 'Back squat 5×5 @ 70%', 'Back squat 5×5 @ 75%'],
  lift: { movement: 'Back squat', pct: [null, 60, 70, 75], sets: 5, reps: 5, gentleMovement: 'Goblet squat' },
};
const warmup: Part = { kind: 'warmup', label: 'Warm-up', title: 'Row and move', versions: ['Row 3 min', 'Row 4 min', 'Row 5 min', 'Row 5 min'] };

const day = { status: 'published' as const, updated_at: '2026-10-20T12:00:00Z', title: 'Squat day', focus: 'Legs', why: 'Build strength', parts: [warmup, squat] };

function rowOf(start: string): CycleRow {
  const p = builtInPlan(start);
  return { start_date: start, week_count: p.weeks.length, name: 'Autumn', why: '', brief: '', goals: [], weeks: p.weeks, days: p.days };
}

function ctx(over: Partial<ChangeContext> = {}): ChangeContext {
  return {
    today: TODAY,
    lifts: MOVES,
    days: { '2026-11-05': day },
    notes: {},
    commentCounts: {},
    cycles: {
      7: { start_date: '2026-10-05', updated_at: '2026-10-01T00:00:00Z', row: rowOf('2026-10-05') },
      8: { start_date: '2026-11-16', updated_at: '2026-10-02T00:00:00Z', row: rowOf('2026-11-16') },
    },
    ...over,
  };
}

const put = (date: string, over: Record<string, unknown> = {}) => ({ kind: 'put_day', date, title: day.title, focus: day.focus, why: day.why, parts: day.parts, ...over });
const problems = (r: ReturnType<typeof validateChanges>) => r.items.flatMap((i) => i.problems);

describe('validateChanges: days', () => {
  it('unchanged day round-trips', () => {
    const r = validateChanges([put('2026-11-05')], ctx());
    expect(r.ok).toBe(true);
    expect(problems(r)).toEqual([]);
    expect(r.items[0].warnings).toEqual([]);
    expect(previewText(r.items)).toContain('no change');
  });

  it('today and past are refused', () => {
    const r = validateChanges([put('2026-10-26'), { kind: 'delete_day', date: '2026-10-20' }], ctx());
    expect(r.ok).toBe(false);
    expect(r.items[0].problems.join(' ')).toMatch(/future/);
    expect(r.items[1].problems.join(' ')).toMatch(/future/);
  });

  it('weekend is refused', () => {
    const r = validateChanges([put('2026-11-01')], ctx());
    expect(r.items[0].problems.length).toBeGreaterThan(0);
  });

  it('unknown lift', () => {
    const parts = [warmup, { ...squat, lift: { ...squat.lift!, movement: 'Zercher squat' } }];
    const r = validateChanges([put('2026-11-05', { parts })], ctx());
    expect(r.items[0].problems.join(' ')).toMatch(/Zercher squat/);
  });

  it('unknown gentle lift', () => {
    const parts = [warmup, { ...squat, lift: { ...squat.lift!, gentleMovement: 'Pogo stick' } }];
    const r = validateChanges([put('2026-11-05', { parts })], ctx());
    expect(r.items[0].problems.join(' ')).toMatch(/Pogo stick/);
  });

  it('duplicate targets', () => {
    const twice = validateChanges([put('2026-11-05'), put('2026-11-05', { title: 'Other' })], ctx());
    expect(twice.ok).toBe(false);
    expect(problems(twice).length).toBeGreaterThan(0);
    const mixed = validateChanges([put('2026-11-05'), { kind: 'put_coach_notes', date: '2026-11-05', body: 'Go easy' }], ctx());
    expect(mixed.ok).toBe(false);
    expect(problems(mixed).length).toBeGreaterThan(0);
  });

  it('status defaults', () => {
    const fresh = validateChanges([put('2026-11-06')], ctx());
    expect(fresh.items[0].ops[0]).toMatchObject({ op: 'put_day', row: { status: 'published' } });
    const drafts = ctx({ days: { '2026-11-05': { ...day, status: 'draft' } } });
    const kept = validateChanges([put('2026-11-05', { title: 'New title' })], drafts);
    expect(kept.items[0].ops[0]).toMatchObject({ op: 'put_day', row: { status: 'draft', title: 'New title' } });
  });

  it('day with comments cannot be deleted', () => {
    const r = validateChanges([{ kind: 'delete_day', date: '2026-11-05' }], ctx({ commentCounts: { '2026-11-05': 1 } }));
    expect(r.ok).toBe(false);
    expect(r.items[0].problems.length).toBeGreaterThan(0);
  });

  it('notes on a missing day', () => {
    const r = validateChanges([{ kind: 'put_coach_notes', date: '2026-11-06', body: 'Go easy' }], ctx());
    expect(r.ok).toBe(false);
    expect(r.items[0].problems.join(' ')).toMatch(/2026-11-06/);
  });

  it('empty notes clear', () => {
    const r = validateChanges([{ kind: 'put_coach_notes', date: '2026-11-05', body: '  ' }], ctx({ notes: { '2026-11-05': { body: 'Old', updated_at: 'n1' } } }));
    expect(r.ok).toBe(true);
    expect(r.items[0].ops).toEqual([{ op: 'put_notes', date: '2026-11-05', body: null }]);
  });

  it('put_day notes field', () => {
    const none = validateChanges([put('2026-11-06')], ctx());
    expect(none.items[0].ops[0]).not.toHaveProperty('notes');
    const blank = validateChanges([put('2026-11-06', { coach_notes: ' ' })], ctx());
    expect(blank.items[0].ops[0]).toMatchObject({ notes: null });
    const text = validateChanges([put('2026-11-06', { coach_notes: ' Go easy ' })], ctx());
    expect(text.items[0].ops[0]).toMatchObject({ notes: 'Go easy' });
  });

  it('long notes are cut with a warning', () => {
    const r = validateChanges([{ kind: 'put_coach_notes', date: '2026-11-05', body: 'x'.repeat(2100) }], ctx());
    expect(r.ok).toBe(true);
    expect(r.items[0].warnings.join(' ')).toMatch(/2000/);
    expect(r.items[0].ops[0]).toMatchObject({ body: 'x'.repeat(2000) });
  });

  it('notes that are not text are refused, not cleared', () => {
    const notes = { '2026-11-05': { body: 'Old', updated_at: 'n1' } };
    const missing = validateChanges([{ kind: 'put_coach_notes', date: '2026-11-05' }], ctx({ notes }));
    expect(missing.ok).toBe(false);
    const nullNotes = validateChanges([put('2026-11-05', { coach_notes: null })], ctx({ notes }));
    expect(nullNotes.ok).toBe(false);
    const numberNotes = validateChanges([put('2026-11-05', { coach_notes: 5 })], ctx({ notes }));
    expect(numberNotes.ok).toBe(false);
  });

  it('seen stamps', () => {
    const r = validateChanges([put('2026-11-05', { title: 'New title' }), put('2026-11-06')], ctx({ notes: { '2026-11-05': { body: 'Old', updated_at: 'n1' } } }));
    expect(r.ok).toBe(true);
    expect(r.seen.days['2026-11-05']).toBe(day.updated_at);
    expect(r.seen.days['2026-11-06']).toBeNull();
    expect(r.seen.notes['2026-11-05']).toBe('n1');
    expect(r.seen.notes['2026-11-06']).toBeNull();
  });
});

describe('validateChanges: cycles', () => {
  it('cycle create in the past', () => {
    const r = validateChanges([{ kind: 'create_cycle', plan: builtInPlan('2026-10-19') }], ctx());
    expect(r.items[0].problems.join(' ')).toMatch(/after today/);
  });

  it('cycle create bad plan', () => {
    const r = validateChanges([{ kind: 'create_cycle', plan: builtInPlan('2027-01-05') }], ctx());
    expect(r.items[0].problems.join(' ')).toMatch(/has to start on a Monday/);
  });

  it('cycle create unknown day lift', () => {
    const p = builtInPlan('2027-01-04');
    const plan = { ...p, days: { ...p.days, '2': { ...p.days['2'], lift: 'Zercher squat' } } };
    const r = validateChanges([{ kind: 'create_cycle', plan }], ctx());
    expect(r.items[0].problems.join(' ')).toMatch(/Zercher squat/);
  });

  it('cycle text cut with a warning', () => {
    const p = builtInPlan('2027-01-04');
    const r = validateChanges([{ kind: 'create_cycle', plan: { ...p, name: 'n'.repeat(90), days: { ...p.days, '3': { ...p.days['3'], notes: 'z'.repeat(250) } } } }], ctx());
    expect(r.ok).toBe(true);
    expect(r.items[0].warnings.join(' ')).toMatch(/name cut to 80/);
    expect(r.items[0].warnings.join(' ')).toMatch(/Wednesday: notes cut to 200/);
  });

  it('cycle missing day or bad style', () => {
    const p = builtInPlan('2027-01-04');
    const { '4': _gone, ...fewer } = p.days;
    const missing = validateChanges([{ kind: 'create_cycle', plan: { ...p, days: fewer } }], ctx());
    expect(missing.items[0].problems.join(' ')).toMatch(/Thursday is missing/);
    const yoga = validateChanges([{ kind: 'create_cycle', plan: { ...p, days: { ...p.days, '2': { ...p.days['2'], style: 'yoga' as never } } } }], ctx());
    expect(yoga.items[0].problems.join(' ')).toMatch(/Tuesday: unknown style "yoga"/);
  });

  it('cycle create makes a clean row', () => {
    const r = validateChanges([{ kind: 'create_cycle', plan: { ...builtInPlan('2027-01-04'), name: 'Winter' } }], ctx());
    expect(r.ok).toBe(true);
    expect(r.items[0].target).toBe('new cycle starting 2027-01-04');
    expect(r.items[0].ops[0]).toMatchObject({ op: 'create_cycle', row: { start_date: '2027-01-04', week_count: 6, name: 'Winter' } });
  });

  it('started cycle keeps its start', () => {
    const moved = validateChanges([{ kind: 'update_cycle', id: 7, plan: { ...builtInPlan('2026-10-12'), name: 'Autumn' } }], ctx());
    expect(moved.ok).toBe(false);
    const kept = validateChanges([{ kind: 'update_cycle', id: 7, plan: { ...builtInPlan('2026-10-05'), name: 'Autumn 2' } }], ctx());
    expect(kept.ok).toBe(true);
    expect(kept.items[0].ops[0]).toMatchObject({ op: 'update_cycle', id: 7 });
    expect(kept.seen.cycles['7']).toBe('2026-10-01T00:00:00Z');
  });

  it('started cycle cannot be deleted', () => {
    const r = validateChanges([{ kind: 'delete_cycle', id: 7 }], ctx());
    expect(r.ok).toBe(false);
    const future = validateChanges([{ kind: 'delete_cycle', id: 8 }], ctx());
    expect(future.ok).toBe(true);
    expect(future.seen.cycles['8']).toBe('2026-10-02T00:00:00Z');
  });

  it('missing cycle id', () => {
    const r = validateChanges([{ kind: 'delete_cycle', id: 99 }], ctx());
    expect(r.ok).toBe(false);
    expect(r.items[0].problems.join(' ')).toMatch(/99/);
  });
});

describe('validateChanges: the batch', () => {
  it('too many changes', () => {
    const many = Array.from({ length: 101 }, () => ({ kind: 'delete_day', date: '2026-11-05' }));
    const r = validateChanges(many, ctx());
    expect(r.ok).toBe(false);
    expect(problems(r)).toHaveLength(1);
  });

  it('unknown kind', () => {
    const r = validateChanges([{ kind: 'rename_gym' }], ctx());
    expect(r.ok).toBe(false);
  });
});
