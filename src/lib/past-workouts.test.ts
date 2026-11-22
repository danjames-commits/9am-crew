import { describe, expect, it } from 'vitest';
import { benchOn, groupByWeek, liftsOn, pastWindow } from './past-workouts';

// 2026-11-16 and 2026-11-23 are Mondays. 2026-11-20 is a Friday.
describe('pastWindow', () => {
  it('ends the first page at the week of the last class done', () => {
    const w = pastWindow({ lastDone: '2026-11-20', earliest: '2026-09-01' });
    expect(w.mondays).toEqual(['2026-11-16', '2026-11-09', '2026-11-02', '2026-10-26']);
    expect(w.from).toBe('2026-10-26');
    expect(w.to).toBe('2026-11-20');
    expect(w.earlier).toBe('2026-10-26');
  });

  it('caps the range at the last class done mid-week', () => {
    const w = pastWindow({ lastDone: '2026-11-18', earliest: '2026-09-01' });
    expect(w.to).toBe('2026-11-18');
  });

  it('moves back exactly 4 weeks with before', () => {
    const w = pastWindow({ before: '2026-10-26', lastDone: '2026-11-20', earliest: '2026-09-01' });
    expect(w.mondays).toEqual(['2026-10-19', '2026-10-12', '2026-10-05', '2026-09-28']);
    expect(w.to).toBe('2026-10-23');
  });

  it('stops at the week of the earliest workout and offers nothing earlier', () => {
    const w = pastWindow({ before: '2026-09-14', lastDone: '2026-11-20', earliest: '2026-09-02' });
    expect(w.mondays).toEqual(['2026-09-07', '2026-08-31']);
    expect(w.from).toBe('2026-08-31');
    expect(w.earlier).toBeNull();
  });

  it('offers nothing earlier when the page ends exactly at the earliest week', () => {
    const w = pastWindow({ lastDone: '2026-11-20', earliest: '2026-10-28' });
    expect(w.mondays.at(-1)).toBe('2026-10-26');
    expect(w.earlier).toBeNull();
  });

  it('falls back to the newest page for a bad before', () => {
    const newest = pastWindow({ lastDone: '2026-11-20', earliest: '2026-09-01' });
    for (const before of ['nope', '2026-13-40x', '', null, undefined, '2030-01-06', '2020-01-06']) {
      expect(pastWindow({ before, lastDone: '2026-11-20', earliest: '2026-09-01' })).toEqual(newest);
    }
  });

  it('is empty when nothing has run', () => {
    expect(pastWindow({ lastDone: '2026-11-20', earliest: null })).toEqual({ mondays: [], from: null, to: null, earlier: null });
  });
});

describe('groupByWeek', () => {
  it('groups newest week first, days in order, and drops empty weeks', () => {
    const rows = [{ class_date: '2026-11-17' }, { class_date: '2026-11-02' }, { class_date: '2026-11-16' }];
    expect(groupByWeek(rows, ['2026-11-16', '2026-11-09', '2026-11-02'])).toEqual([
      { monday: '2026-11-16', days: [{ class_date: '2026-11-16' }, { class_date: '2026-11-17' }] },
      { monday: '2026-11-02', days: [{ class_date: '2026-11-02' }] },
    ]);
  });
});

describe('liftsOn', () => {
  it('keeps logs from that date and drops undated ones', () => {
    const logs = [{ logged_on: '2026-11-17' }, { logged_on: null }, { logged_on: '2026-11-18' }];
    expect(liftsOn(logs, '2026-11-17')).toEqual([{ logged_on: '2026-11-17' }]);
  });
});

describe('benchOn', () => {
  it('matches workout_date first, done_on only when workout_date is empty', () => {
    const r = [
      { id: 1, workout_date: '2026-11-17', done_on: '2026-11-19' },
      { id: 2, workout_date: null, done_on: '2026-11-17' },
      { id: 3, workout_date: '2026-11-18', done_on: '2026-11-17' },
      { id: 4, workout_date: null, done_on: null },
    ];
    expect(benchOn(r, '2026-11-17').map((x) => x.id)).toEqual([1, 2]);
  });
});
