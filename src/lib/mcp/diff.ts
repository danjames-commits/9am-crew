// Compact before/after text for a batch of changes, for the coach to read in chat.
import { WEEKDAYS } from '../programming/plan';
import { LEVELS, type Part } from '../types';
import { same, type CycleRow, type DayPreview, type ItemResult, type NotesPreview } from './changes';

const CUT = 200;
const CONTEXT = 30;

const oneLine = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : JSON.stringify(v)).replace(/\s+/g, ' ').trim();
const cut = (s: string) => (s.length > CUT ? s.slice(0, CUT - 1) + '…' : s);

/** "old → new", trimmed to the part that differs so small edits in long text stay short. */
function change(a: unknown, b: unknown): string {
  let x = oneLine(a);
  let y = oneLine(b);
  let p = 0;
  while (p < x.length && p < y.length && x[p] === y[p]) p++;
  let s = 0;
  while (s < x.length - p && s < y.length - p && x[x.length - 1 - s] === y[y.length - 1 - s]) s++;
  if (s > CONTEXT) {
    x = x.slice(0, x.length - s + CONTEXT) + '…';
    y = y.slice(0, y.length - s + CONTEXT) + '…';
  }
  if (p > CONTEXT) {
    x = '…' + x.slice(p - CONTEXT);
    y = '…' + y.slice(p - CONTEXT);
  }
  return `${cut(x) || '(empty)'} → ${cut(y) || '(empty)'}`;
}

export function previewText(items: ItemResult[]): string {
  return items.map(block).join('\n\n');
}

function block(item: ItemResult): string {
  const lines = [item.target];
  for (const p of item.problems) lines.push(`  ✗ ${p}`);
  for (const w of item.warnings) lines.push(`  ! ${w}`);
  if (!item.problems.length) lines.push(...changeLines(item).map((l) => `  ${l}`));
  return lines.join('\n');
}

function changeLines(item: ItemResult): string[] {
  if (!item.ops.length) return ['no change'];
  const op = item.ops[0];
  switch (op.op) {
    case 'put_day':
      return dayLines(item.before as DayPreview | null, item.after as DayPreview);
    case 'delete_day': {
      const before = item.before as DayPreview | null;
      return [`delete day: ${before?.title ?? ''}`];
    }
    case 'put_notes': {
      const before = (item.before as NotesPreview).notes;
      if (op.body === null) return ['coach notes cleared'];
      return [before === null ? `coach notes: ${cut(oneLine(op.body))}` : `coach notes: ${change(before, op.body)}`];
    }
    case 'create_cycle':
      return [`new cycle: ${op.row.name || '(no name)'}, ${op.row.week_count} weeks from ${op.row.start_date}`, ...cycleDays(op.row)];
    case 'update_cycle':
      return cycleLines(item.before as CycleRow, op.row);
    case 'delete_cycle': {
      const before = item.before as CycleRow;
      return [`delete cycle: ${before.name || '(no name)'} (from ${before.start_date})`];
    }
  }
}

function dayLines(before: DayPreview | null, after: DayPreview): string[] {
  if (!before) {
    const lines = [`new day: ${after.title} (${after.status})`];
    after.parts.forEach((p, i) => lines.push(`  ${i + 1}. ${p.title}`));
    if (after.notes) lines.push(`  coach notes: ${cut(oneLine(after.notes))}`);
    return lines;
  }
  const lines: string[] = [];
  for (const key of ['title', 'focus', 'why', 'status', 'notes'] as const) {
    if (key in after && !same(before[key] ?? null, after[key] ?? null)) lines.push(`${key}: ${change(before[key], after[key])}`);
  }
  const count = Math.max(before.parts.length, after.parts.length);
  for (let i = 0; i < count; i++) lines.push(...partLines(i + 1, before.parts[i], after.parts[i]));
  return lines;
}

function partLines(n: number, a: Part | undefined, b: Part | undefined): string[] {
  if (!a && b) return [`Part ${n} added: ${b.title}`];
  if (a && !b) return [`Part ${n} removed: ${a.title}`];
  if (!a || !b || same(a, b)) return [];
  const name = `Part ${n} (${b.title})`;
  const lines: string[] = [];
  if (a.title !== b.title) lines.push(`${name} title: ${change(a.title, b.title)}`);
  LEVELS.forEach(({ n: l, name: level }, j) => {
    if (a.versions[j] !== b.versions[j]) lines.push(`${name} L${l} ${level}: ${change(a.versions[j], b.versions[j])}`);
  });
  const other = (['kind', 'label', 'minutes', 'lift', 'outdoor', 'benchmark'] as const).filter((k) => !same(a[k], b[k]));
  if (other.length) lines.push(`${name}: ${other.join(', ')} changed`);
  return lines;
}

const weekText = (w: CycleRow['weeks'][number] | undefined) => (w ? (w.kind === 'test' ? `${w.label} (test, ${w.reps} reps)` : `${w.label} ${w.pct}% ${w.sets}×${w.reps}`) : '(none)');
const dayText = (d: CycleRow['days'][string] | undefined) =>
  d ? [d.focus, d.style, d.lift ? `lift ${d.lift}${d.gentle && d.gentle !== d.lift ? ` (Gentle: ${d.gentle})` : ''}` : 'no lift', d.skill ? 'pull-up skill' : '', d.notes ?? ''].filter(Boolean).join(', ') : '(none)';

function cycleDays(row: CycleRow): string[] {
  return WEEKDAYS.map(({ n, short }) => `  ${short}: ${dayText(row.days[n])}`);
}

function cycleLines(before: CycleRow, after: CycleRow): string[] {
  const lines: string[] = [];
  for (const key of ['start_date', 'name', 'why', 'brief'] as const) {
    if (before[key] !== after[key]) lines.push(`${key}: ${change(before[key], after[key])}`);
  }
  if (!same(before.goals, after.goals)) lines.push(`goals: ${change(before.goals.join('; '), after.goals.join('; '))}`);
  if (before.week_count !== after.week_count) lines.push(`weeks: ${before.week_count} → ${after.week_count}`);
  const weeks = Math.max(before.weeks.length, after.weeks.length);
  for (let i = 0; i < weeks; i++) {
    if (!same(before.weeks[i], after.weeks[i])) lines.push(`week ${i + 1}: ${weekText(before.weeks[i])} → ${weekText(after.weeks[i])}`);
  }
  for (const { n, short } of WEEKDAYS) {
    if (!same(before.days[n], after.days[n])) lines.push(`${short}: ${change(dayText(before.days[n]), dayText(after.days[n]))}`);
  }
  return lines;
}
