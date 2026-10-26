import { describe, expect, it } from 'vitest';
import { checkRange, dayView, type CycleSpan } from './read';

const cycles: CycleSpan[] = [{ id: 1, name: 'Autumn', start_date: '2026-11-02', end_date: '2026-12-11' }];
const row = { class_date: '2026-11-04', title: 'Heavy day', focus: 'Squat', why: 'Build', parts: [], status: 'published' as const, updated_at: '2026-10-30T12:00:00Z' };

describe('checkRange', () => {
  it('accepts a normal range', () => expect(checkRange('2026-11-02', '2026-11-13')).toBeNull());
  it('rejects more than 70 days', () => expect(checkRange('2026-11-02', '2027-02-01')).toMatch(/70 days/));
  it('rejects to before from', () => expect(checkRange('2026-11-03', '2026-11-02')).toBeTruthy());
  it('rejects a bad date', () => expect(checkRange('nope', '2026-11-02')).toBeTruthy());
});

describe('dayView', () => {
  it('marks past dates not editable', () => {
    expect(dayView(row, '2026-11-04', null, cycles, '2026-11-10').editable).toBe(false);
  });
  it('marks future dates editable', () => {
    expect(dayView(row, '2026-11-04', null, cycles, '2026-11-03').editable).toBe(true);
  });
  it('gives exists:false and no parts without a row', () => {
    const v = dayView(null, '2026-11-05', null, cycles, '2026-11-01');
    expect(v.exists).toBe(false);
    expect(v.parts).toBeUndefined();
    expect(v.weekday).toBe('Thursday');
  });
  it('finds the covering cycle', () => {
    expect(dayView(null, '2026-11-05', null, cycles, '2026-11-01').cycle).toEqual({ id: 1, name: 'Autumn' });
    expect(dayView(null, '2027-01-05', null, cycles, '2026-11-01').cycle).toBeNull();
  });
  it('treats the cycle end date as the first day after it', () => {
    const six: CycleSpan[] = [{ id: 2, name: 'Winter', start_date: '2026-11-02', end_date: '2026-12-14' }];
    expect(dayView(null, '2026-12-11', null, six, '2026-11-01').cycle).toEqual({ id: 2, name: 'Winter' });
    expect(dayView(null, '2026-12-14', null, six, '2026-11-01').cycle).toBeNull();
  });
  it('includes row fields and coach notes', () => {
    const v = dayView(row, '2026-11-04', 'go easy', cycles, '2026-11-01');
    expect(v).toMatchObject({ exists: true, title: 'Heavy day', status: 'published', coach_notes: 'go easy' });
  });
});
