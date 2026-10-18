export type PartBlock =
  | { kind: 'text'; text: string }
  | { kind: 'list'; label: string | null; items: string[] };

// "2 rounds: a · b" → label "2 rounds". The colon must be followed by a space so times like 0:30 don't count.
const LEAD_LABEL = /^([^:·\n]{1,30}):\s+(.*)$/;

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Splits a workout part's text for display. A line with " · " becomes a list
 * (with its "Label:" lead-in as a heading); any other line stays as text.
 */
export function splitPartText(text: string): PartBlock[] {
  const blocks: PartBlock[] = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (!line.includes(' · ')) {
      blocks.push({ kind: 'text', text: line });
      continue;
    }
    const m = LEAD_LABEL.exec(line);
    const label = m ? m[1].trim() : null;
    const rest = m ? m[2] : line;
    const items = rest.split(' · ').map((s) => s.trim()).filter(Boolean).map(capitalize);
    blocks.push({ kind: 'list', label, items });
  }
  return blocks;
}
