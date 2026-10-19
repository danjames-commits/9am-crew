import { describe, expect, it } from 'vitest';
import { bestResult, formatScore, isNewBest, parseTime, readScore, scoreKey, type Benchmark, type BenchResult } from './benchmarks';

const run: Benchmark = { id: 1, name: '1 km run', score: 'time', better: 'lower', description: null, sort: 1 };
const hang: Benchmark = { id: 2, name: 'Max dead hang', score: 'time', better: 'higher', description: null, sort: 2 };
const cindy: Benchmark = { id: 3, name: 'Cindy', score: 'rounds_reps', better: 'higher', description: null, sort: 3 };
const res = (o: Partial<BenchResult>): BenchResult => ({
  id: 0, benchmark_id: 1, user_id: 'u', done_on: '2026-10-20', level: 3,
  time_s: null, rounds: null, reps: null, amount: null, capped: false, note: null, workout_date: null, ...o,
});

describe('parseTime', () => {
  it('reads m:ss, h:mm:ss and bare minutes', () => {
    expect(parseTime('4:32')).toBe(272);
    expect(parseTime('1:02:03')).toBe(3723);
    expect(parseTime('12')).toBe(720);
    expect(parseTime(' 0:45 ')).toBe(45);
  });
  it('rejects nonsense', () => {
    for (const s of ['', 'abc', '4:75', '1:60:00', '0:00', '4.5.6']) expect(parseTime(s)).toBeNull();
  });
});

describe('scores', () => {
  it('formats each kind', () => {
    expect(formatScore(run, res({ time_s: 272 }))).toBe('4:32');
    expect(formatScore(run, res({ time_s: 3723 }))).toBe('1:02:03');
    expect(formatScore(run, res({ capped: true, reps: 160 }))).toBe('Capped · 160 reps');
    expect(formatScore(cindy, res({ rounds: 12, reps: 7 }))).toBe('12 + 7');
    expect(formatScore({ score: 'distance' }, res({ amount: 1250 }))).toBe('1,250 m');
  });
  it('ranks: faster wins, finishing beats the cap, longer hangs win, more rounds win', () => {
    expect(scoreKey(run, res({ time_s: 260 }))).toBeGreaterThan(scoreKey(run, res({ time_s: 272 })));
    expect(scoreKey(run, res({ time_s: 1500 }))).toBeGreaterThan(scoreKey(run, res({ capped: true, reps: 999 })));
    expect(scoreKey(hang, res({ time_s: 70 }))).toBeGreaterThan(scoreKey(hang, res({ time_s: 60 })));
    expect(scoreKey(cindy, res({ rounds: 12, reps: 0 }))).toBeGreaterThan(scoreKey(cindy, res({ rounds: 11, reps: 29 })));
  });
  it('finds the best per level and spots new bests', () => {
    const all = [res({ id: 1, time_s: 300 }), res({ id: 2, time_s: 280 }), res({ id: 3, time_s: 200, level: 4 })];
    expect(bestResult(run, all)?.id).toBe(3);
    expect(bestResult(run, all, 3)?.id).toBe(2);
    expect(isNewBest(run, all, res({ time_s: 279 }))).toBe(true);
    expect(isNewBest(run, all, res({ time_s: 281 }))).toBe(false);
    expect(isNewBest(run, all, res({ time_s: 500, level: 1 }))).toBe(true);
  });
});

describe('readScore', () => {
  it('reads what people type', () => {
    expect(readScore(run, { time: '4:32' })).toMatchObject({ ok: true, time_s: 272 });
    expect(readScore(run, { capped: true, reps: '150' })).toMatchObject({ ok: true, reps: 150, capped: true, time_s: null });
    expect(readScore(cindy, { rounds: '12', reps: '' })).toMatchObject({ ok: true, rounds: 12, reps: 0 });
    expect(readScore({ score: 'calories' }, { amount: '52' })).toMatchObject({ ok: true, amount: 52 });
  });
  it('explains what is missing', () => {
    expect(readScore(run, { time: 'soon' })).toMatchObject({ ok: false });
    expect(readScore(run, { capped: true })).toMatchObject({ ok: false });
    expect(readScore(cindy, { rounds: '' })).toMatchObject({ ok: false });
    expect(readScore({ score: 'reps' }, { reps: '-3' })).toMatchObject({ ok: false });
  });
});
