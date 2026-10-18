import { describe, expect, it } from 'vitest';
import { cleanCoachNotes, splitCoachNotes } from './coach-notes';

describe('cleanCoachNotes', () => {
  it('trims whitespace', () => {
    expect(cleanCoachNotes('  Run in two waves  ')).toBe('Run in two waves');
  });
  it('normalises line endings to \\n', () => {
    expect(cleanCoachNotes('Line one\r\nLine two')).toBe('Line one\nLine two');
  });
  it('returns empty string for whitespace-only input', () => {
    expect(cleanCoachNotes('   \n  ')).toBe('');
  });
  it('returns empty string for non-strings', () => {
    expect(cleanCoachNotes(undefined)).toBe('');
    expect(cleanCoachNotes(42)).toBe('');
  });
  it('caps length at COACH_NOTES_MAX', () => {
    expect(cleanCoachNotes('x'.repeat(2500))).toHaveLength(2000);
  });
});

describe('splitCoachNotes', () => {
  it('splits on Label: lines and puts leading text under General', () => {
    const note = 'Two coaches if possible. Machine-only intervals: no running.\nScaling: step instead of jump.\nNo machine (warm-up/cool-down): jumping jacks.\nLadder: Bar × 8, ~50% × 5.';
    expect(splitCoachNotes(note)).toEqual([
      { label: 'General', text: 'Two coaches if possible. Machine-only intervals: no running.' },
      { label: 'Scaling', text: 'step instead of jump.' },
      { label: 'No machine (warm-up/cool-down)', text: 'jumping jacks.' },
      { label: 'Ladder', text: 'Bar × 8, ~50% × 5.' },
    ]);
  });
  it('joins unlabeled lines to the section above', () => {
    expect(splitCoachNotes('Test: stop at RPE 8.\nWeek 1 3RM × 1.06 = e1RM.')).toEqual([
      { label: 'Test', text: 'stop at RPE 8.\nWeek 1 3RM × 1.06 = e1RM.' },
    ]);
  });
  it('does not treat a time like Cap 12:00 as a label', () => {
    expect(splitCoachNotes('Cap 12:00 fixed')).toEqual([{ label: 'General', text: 'Cap 12:00 fixed' }]);
  });
});
