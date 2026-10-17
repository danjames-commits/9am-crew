export const COACH_NOTES_MAX = 2000;

/** Cleans a coach note. Returns the trimmed text, or '' when there is no note. */
export function cleanCoachNotes(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/\r\n?/g, '\n').trim().slice(0, COACH_NOTES_MAX);
}
