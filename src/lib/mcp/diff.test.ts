import { describe, expect, it } from 'vitest';
import type { Part } from '../types';
import { validateChanges, type ChangeContext } from './changes';
import { previewText } from './diff';

const MOVES = ['Back squat', 'Front squat', 'Deadlift', 'Bench press', 'Strict press', 'Push press', 'Power clean', 'Snatch', 'Squat clean & jerk'];

const long = (s: string) => `${s}: ` + 'Row 500 m, then 15 wall balls, 10 box jumps and 5 burpees. Rest 1 minute between rounds and keep the pace even. '.repeat(3);
const conditioning: Part = { kind: 'conditioning', label: 'Conditioning', title: 'Row intervals', versions: [long('Gentle'), long('Steady'), long('Strong'), long('Full')] };
const warmup: Part = { kind: 'warmup', label: 'Warm-up', title: 'Row and move', versions: ['Row 3 min', 'Row 4 min', 'Row 5 min', 'Row 5 min'] };

function dayOn(date: string) {
  return { status: 'published' as const, updated_at: 'u-' + date, title: 'Engine day', focus: 'Engine', why: 'Fitness', parts: [warmup, conditioning] };
}

function ctxFor(dates: string[]): ChangeContext {
  return { today: '2026-10-26', lifts: MOVES, days: Object.fromEntries(dates.map((d) => [d, dayOn(d)])), notes: {}, commentCounts: {}, cycles: {} };
}

function strongChanged(date: string) {
  const d = dayOn(date);
  const versions = [...conditioning.versions] as Part['versions'];
  versions[2] = versions[2].replace('15 wall balls', '20 wall balls');
  return { kind: 'put_day', date, title: d.title, focus: d.focus, why: d.why, parts: [warmup, { ...conditioning, versions }] };
}

describe('previewText', () => {
  it('shows only the changed level', () => {
    const r = validateChanges([strongChanged('2026-11-05')], ctxFor(['2026-11-05']));
    const text = previewText(r.items);
    expect(text).toMatch(/Part 2.*L3 Strong: .* → /);
    expect(text).toContain('20 wall balls');
    expect(text).not.toMatch(/L[124] /);
    expect(text).not.toMatch(/title|focus|why/);
  });

  it('stays short for a 20-day change', () => {
    const dates: string[] = [];
    for (let d = new Date('2026-11-02T12:00:00Z'); dates.length < 20; d.setUTCDate(d.getUTCDate() + 1)) {
      if (d.getUTCDay() >= 1 && d.getUTCDay() <= 5) dates.push(d.toISOString().slice(0, 10));
    }
    const r = validateChanges(dates.map(strongChanged), ctxFor(dates));
    expect(r.ok).toBe(true);
    const text = previewText(r.items);
    expect(text.match(/L3 Strong/g)).toHaveLength(20);
    expect(text.length).toBeLessThan(8000);
  });

  it('describes a new day', () => {
    const r = validateChanges([{ ...strongChanged('2026-11-05'), status: 'draft' }], ctxFor([]));
    const text = previewText(r.items);
    expect(text).toContain('new day: Engine day (draft)');
    expect(text).toContain('Row intervals');
  });

  it('lists problems', () => {
    const r = validateChanges([strongChanged('2026-10-20')], ctxFor([]));
    expect(previewText(r.items)).toMatch(/✗ .*future/);
  });
});
