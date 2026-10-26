import { describe, expect, it } from 'vitest';
import { checkParts, cleanParts, cleanWorkoutFields } from './workout-clean';
import type { Part } from './types';

const four = (s = 'x') => [s, s, s, s];

const strength = (): Part => ({
  kind: 'strength',
  label: 'Strength',
  title: 'Back squat',
  versions: ['a', 'b', 'c', 'd'],
  lift: { movement: 'Back squat', pct: [50, 60, 70, 75], sets: 5, reps: 5, gentleMovement: 'Goblet squat', mode: 'percent' },
});

describe('checkParts', () => {
  it('keeps a valid part as-is', () => {
    const input = [strength()];
    const r = checkParts(input);
    expect(r.problems).toEqual([]);
    expect(r.warnings).toEqual([]);
    expect(r.parts).toEqual(input);
  });

  it('names the bad part', () => {
    const bad = { kind: 'conditioning', label: 'WOD', title: 'Fran', versions: ['a', 'b', 'c'] };
    const r = checkParts([strength(), bad]);
    expect(r.parts).toBeNull();
    expect(r.problems[0]).toMatch(/Part 2.*4 level versions/);
  });

  it('unknown kind is a problem', () => {
    const r = checkParts([{ kind: 'cardio', label: '', title: '', versions: four() }]);
    expect(r.parts).toBeNull();
    expect(r.problems[0]).toMatch(/Part 1.*kind/);
  });

  it('more than 12 parts is a problem', () => {
    const r = checkParts(Array.from({ length: 13 }, strength));
    expect(r.parts).toBeNull();
    expect(r.problems[0]).toMatch(/12/);
  });

  it('non-array input is a problem', () => {
    expect(checkParts('nope').parts).toBeNull();
    expect(checkParts('nope').problems).toHaveLength(1);
  });

  it('warns when text is trimmed', () => {
    const p = strength();
    p.versions[0] = 'y'.repeat(1600);
    const r = checkParts([p]);
    expect(r.parts![0].versions[0].length).toBe(1500);
    expect(r.warnings[0]).toMatch(/cut to 1500/);
    expect(r.warnings[0]).toMatch(/Part 1 level 1/);
    expect(r.problems).toEqual([]);
  });

  it('keeps benchmark and outdoor benchmark', () => {
    const p: Part = {
      kind: 'conditioning',
      label: 'WOD',
      title: 'Fran',
      versions: ['a', 'b', 'c', 'd'],
      benchmark: ' Fran ',
      outdoor: { title: 'Run', versions: ['a', 'b', 'c', 'd'], benchmark: ' Cindy ' },
    };
    const r = checkParts([p]);
    expect(r.parts![0].benchmark).toBe('Fran');
    expect(r.parts![0].outdoor?.benchmark).toBe('Cindy');
  });
});

describe('cleanParts', () => {
  it('matches checkParts().parts', () => {
    const good = [strength()];
    const bad = [{ kind: 'cardio', versions: four() }];
    expect(cleanParts(good)).toEqual(checkParts(good).parts);
    expect(cleanParts(bad)).toBeNull();
    expect(cleanParts('x')).toBeNull();
  });
});

describe('cleanWorkoutFields', () => {
  it('an empty title is a problem', () => {
    const r = cleanWorkoutFields({ title: '   ', focus: 'f', why: 'w' });
    expect(r.problems[0]).toMatch(/title/i);
  });

  it('trims a long why with a warning', () => {
    const r = cleanWorkoutFields({ title: 'T', focus: 'f', why: 'w'.repeat(700) });
    expect(r.why.length).toBe(600);
    expect(r.warnings[0]).toMatch(/600/);
    expect(r.problems).toEqual([]);
  });
});
