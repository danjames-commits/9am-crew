import { describe, expect, it } from 'vitest';
import { parseRound, partialRound } from './round-parse';

describe('reading a round', () => {
  const station =
    'Learn the stations. Then 10 min, as many rounds as you can, steady:\n10 wall balls (6/10 lb) · 20 m farmers carry 2 × 26/35 lb · 10 sandbag lunges (22/33 lb, total) · 4 burpee broad jumps\nWrite down rounds + reps. Redo in week 8.';
  it('finds the movements and counts', () => {
    expect(parseRound(station)).toEqual([
      { count: 10, unit: 'reps', name: 'Wall balls' },
      { count: 20, unit: 'm', name: 'Farmers carry' },
      { count: 10, unit: 'reps', name: 'Sandbag lunges' },
      { count: 4, unit: 'reps', name: 'Burpee broad jumps' },
    ]);
  });
  it('reads bullet lists and calories', () => {
    expect(parseRound('12 min AMRAP:\n- 10 cal row\n- 15 KB swings @ 35 lb\n- 5 push-ups')).toEqual([
      { count: 10, unit: 'cal', name: 'Row' },
      { count: 15, unit: 'reps', name: 'KB swings' },
      { count: 5, unit: 'reps', name: 'Push-ups' },
    ]);
  });
  it('gives up on plain text', () => {
    expect(parseRound('Back squat 5×5 @ 75%')).toEqual([]);
  });
  it('adds up the partial round', () => {
    const items = parseRound(station);
    expect(partialRound(items, [10, 20, 4, 0])).toEqual({ reps: 14, note: 'Partial round: 10 wall balls, 20 m farmers carry, 4 sandbag lunges' });
  });
});
