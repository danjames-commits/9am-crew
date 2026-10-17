import { describe, expect, it } from 'vitest';
import { cleanCoachNotes } from './coach-notes';

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
