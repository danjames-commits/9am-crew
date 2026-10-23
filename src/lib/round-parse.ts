// Reads the movements in one round of a workout ("10 wall balls · 20 m farmers carry ·
// 4 burpee broad jumps") so a member can say how far they got into an unfinished round.

export interface RoundItem {
  count: number;
  /** reps, or metres / calories for a carry, run or machine piece. */
  unit: 'reps' | 'm' | 'cal';
  name: string;
}

export function parseRound(text: string): RoundItem[] {
  const items: RoundItem[] = [];
  for (const raw of text.split(/\n|·|•|;/)) {
    const seg = raw.replace(/^\s*[-*]\s*/, '').trim();
    const m = /^(\d{1,4})\s*(m|metres?|meters?|cal|cals|calories?)?\s+([a-z].*)$/i.exec(seg);
    if (!m) continue;
    const unitWord = (m[2] ?? '').toLowerCase();
    if (/^min/.test(m[3])) continue; // "10 min AMRAP"
    const name = m[3]
      .replace(/\(.*?\)/g, '')
      .split(/\s\d|@|,/)[0]
      .trim()
      .replace(/\s+/g, ' ');
    if (!name || /^(rounds?|sets?|min|minutes?|sec|seconds?)\b/i.test(name)) continue;
    items.push({
      count: Number(m[1]),
      unit: unitWord.startsWith('m') ? 'm' : unitWord.startsWith('cal') ? 'cal' : 'reps',
      name: name[0].toUpperCase() + name.slice(1),
    });
  }
  return items.length >= 2 && items.length <= 8 ? items : [];
}

/** "10 wall balls, 20 m farmers carry" for the note, and the reps that count toward the score. */
export function partialRound(items: RoundItem[], done: number[]) {
  const parts = items.map((it, i) => (done[i] ? `${done[i]}${it.unit === 'reps' ? '' : ` ${it.unit}`} ${it.name.toLowerCase()}` : '')).filter(Boolean);
  const reps = items.reduce((sum, it, i) => sum + (it.unit === 'reps' ? done[i] ?? 0 : 0), 0);
  return { note: parts.length ? `Partial round: ${parts.join(', ')}` : '', reps };
}
