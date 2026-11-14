import { describe, expect, test } from 'vitest';
import { spellSets } from '@/components/PartText';

describe('spellSets', () => {
  test('spells out sets and reps', () => {
    expect(spellSets('Back squat: 5 × 3 @ 80%')).toBe('Back squat: 5 sets of 3 @ 80%');
    expect(spellSets('Deadlift 5x5 @ 76%')).toBe('Deadlift 5 sets of 5 @ 76%');
    expect(spellSets('3 × 10 each side')).toBe('3 sets of 10 each side');
    expect(spellSets('1 × 5')).toBe('1 set of 5');
  });

  test('leaves times and plain text alone', () => {
    expect(spellSets('3 × 7 min AMRAP')).toBe('3 × 7 min AMRAP');
    expect(spellSets('Build to a heavy single')).toBe('Build to a heavy single');
  });
});
