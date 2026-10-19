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

// Words in a section label that point at a kind of part.
const KIND_WORDS: Record<string, string[]> = {
  warmup: ['warm', 'warmup'],
  strength: ['strength', 'load', 'loads', 'lift', 'ladder', 'press', 'squat', 'deadlift', 'clean', 'snatch', 'jerk', 'bench', 'power', 'e1rm'],
  skill: ['skill', 'accessory', 'superset', 'toes', 'pull', 'pullup', 'gymnastics'],
  conditioning: ['conditioning', 'interval', 'intervals', 'amrap', 'emom', 'machine', 'pace', 'station', 'stations', 'targets', 'sled', 'stagger', 'overflow', 'run', 'row', 'bike'],
  cooldown: ['cool', 'cooldown', 'flush', 'mobility', 'stretch'],
};
const LOOSE_WORDS = ['machine', 'targets', 'pace', 'run', 'row', 'bike', 'no'];
// Labels about the whole class, shown before it starts.
const GENERAL_WORDS = ['scaling', 'masters', 'general', 'injury', 'flex', 'week', 'new', 'sore'];

const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter((w) => w.length > 1);

type PartLike = { kind: string; label: string; title: string };

/**
 * Sorts a day's coach note sections onto the parts they're about, for coach mode.
 * Returns the sections for each part (same order as parts) and the rest as general notes.
 */
export function notesByPart(sections: CoachNoteSection[], parts: PartLike[]) {
  const perPart: CoachNoteSection[][] = parts.map(() => []);
  const general: CoachNoteSection[] = [];
  for (const s of sections) {
    const label = words(s.label);
    // Specific words ("warm", "Cindy", "loads") beat loose ones ("machine", "targets"), so
    // "No machine (warm-up/cool-down)" lands on the warm-up and cool-down, not conditioning.
    const match = (ws: string[]) => {
      const hits = new Set<number>();
      parts.forEach((p, i) => {
        const own = new Set([...words(p.label), ...words(p.title)].filter((w) => !['part', 'the', 'and', 'with', 'of'].includes(w)));
        const kind = KIND_WORDS[p.kind] ?? [];
        if (ws.some((w) => kind.includes(w) || own.has(w))) hits.add(i);
      });
      return hits;
    };
    const strong = match(label.filter((w) => !LOOSE_WORDS.includes(w)));
    const hits = strong.size ? strong : match(label);
    // A label that only matched through a generic word ("targets", "machine") on several parts
    // is still useful on each of them; a label about the whole class goes to the start.
    if (hits.size === 0 || (label.some((w) => GENERAL_WORDS.includes(w)) && hits.size !== 1)) general.push(s);
    else for (const i of hits) perPart[i].push(s);
  }
  return { perPart, general };
}
