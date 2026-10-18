export const COACH_NOTES_MAX = 2000;

/** Cleans a coach note. Returns the trimmed text, or '' when there is no note. */
export function cleanCoachNotes(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/\r\n?/g, '\n').trim().slice(0, COACH_NOTES_MAX);
}

export type CoachNoteSection = { label: string; text: string };

// A line that starts with a short "Label:" opens a new section.
const LABEL_LINE = /^([A-Z][^:\n]{0,30}):\s+(.*)$/;

/**
 * Splits a coach note into labeled sections for display. Lines without a
 * label join the section above; leading unlabeled lines become "General".
 */
export function splitCoachNotes(body: string): CoachNoteSection[] {
  const sections: CoachNoteSection[] = [];
  for (const raw of body.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const m = LABEL_LINE.exec(line);
    if (m && m[2]) {
      sections.push({ label: m[1].trim(), text: m[2] });
    } else if (sections.length) {
      sections[sections.length - 1].text += '\n' + line;
    } else {
      sections.push({ label: 'General', text: line });
    }
  }
  return sections;
}
