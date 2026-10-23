import { describe, expect, it } from 'vitest';
import { buttonsFor, cleanPlan, describeStep, parseTime, stepSeconds } from './clock-plan';
import { CLOCK_TESTS } from './clock-tests';
import { ALL_CLOCK_BUTTONS } from './clock-buttons';

describe('gym clock plan', () => {
  it('types a countdown the same way as the setup test', () => {
    const test = CLOCK_TESTS.find((t) => t.id === 'start-20s')!;
    expect(buttonsFor({ type: 'countdown', label: '', seconds: 20 })).toEqual(test.buttons);
    expect(buttonsFor({ type: 'countdown', label: '', seconds: 12 * 60 })).toEqual(['Exit', 'Down', 'Left', '1', '2', 'Right', '0', '0', 'OK']);
  });
  it('types intervals the same way as the setup test', () => {
    const test = CLOCK_TESTS.find((t) => t.id === 'interval')!;
    expect(buttonsFor({ type: 'intervals', label: '', rounds: 3, work: 20, rest: 10 })).toEqual(test.buttons);
  });
  it('only uses real buttons, and stays under the 24-press limit', () => {
    const b = buttonsFor({ type: 'intervals', label: '', rounds: 12, work: 99 * 60 + 59, rest: 59 * 60 });
    expect(b.length).toBeLessThanOrEqual(24);
    expect(b.every((x) => ALL_CLOCK_BUTTONS.includes(x))).toBe(true);
  });
  it('works out how long things run', () => {
    expect(stepSeconds({ type: 'intervals', label: '', rounds: 8, work: 20, rest: 10 })).toBe(8 * 20 + 7 * 10);
    expect(describeStep({ type: 'intervals', label: '', rounds: 10, work: 60, rest: 0 })).toBe('10 × 1:00 on');
  });
  it('reads times people type', () => {
    expect(parseTime('12')).toBe(720);
    expect(parseTime('0:45')).toBe(45);
    expect(parseTime('45s')).toBe(45);
    expect(parseTime('1.5')).toBe(90);
    expect(parseTime('abc')).toBeNull();
  });
  it('drops what the clock cannot run', () => {
    const plan = cleanPlan(
      [
        { part: 2, label: 'Conditioning', steps: [{ type: 'countdown', label: 'AMRAP', seconds: 720 }, { type: 'stopwatch' }, { type: 'intervals', rounds: 0, work: 30, rest: 0 }] },
        { part: 9, label: 'Nope', steps: [{ type: 'countdown', label: '', seconds: 60 }] },
      ],
      4,
    );
    expect(plan).toEqual([{ part: 2, label: 'Conditioning', steps: [{ type: 'countdown', label: 'AMRAP', seconds: 720 }] }]);
  });
});

