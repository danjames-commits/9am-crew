// Checks a batch of proposed programming changes and turns them into clean ops.
// Pure: the caller loads the context, and the SQL functions apply the ops.
import { cleanCoachNotes, COACH_NOTES_MAX } from '../coach-notes';
import { isWeekday } from '../dates';
import { gentleChoices, STYLES } from '../programming/engine';
import { cleanPlan, WEEKDAYS, type PlanDraft } from '../programming/plan';
import type { Part } from '../types';
import { checkParts, cleanWorkoutFields } from '../workout-clean';
import { isRealDate } from './read';

export type Status = 'draft' | 'published';

export type Change =
  | { kind: 'put_day'; date: string; title: string; focus?: string; why?: string; parts: unknown; status?: Status; coach_notes?: string | null }
  | { kind: 'delete_day'; date: string }
  | { kind: 'put_coach_notes'; date: string; body: string }
  | { kind: 'create_cycle'; plan: PlanDraft }
  | { kind: 'update_cycle'; id: number; plan: PlanDraft }
  | { kind: 'delete_cycle'; id: number };

export type CycleRow = { start_date: string; week_count: number; name: string; why: string; brief: string; goals: string[]; weeks: PlanDraft['weeks']; days: PlanDraft['days'] };

export type DayRow = { title: string; focus: string; why: string; parts: Part[]; status: Status };

// What gets stored and what the SQL functions apply. Already clean.
export type Op =
  | { op: 'put_day'; date: string; row: DayRow; notes?: string | null } // null = clear, absent = untouched
  | { op: 'delete_day'; date: string }
  | { op: 'put_notes'; date: string; body: string | null }
  | { op: 'create_cycle'; row: CycleRow }
  | { op: 'update_cycle'; id: number; row: CycleRow }
  | { op: 'delete_cycle'; id: number };

export interface ChangeContext {
  today: string;
  lifts: string[];
  days: Record<string, (DayRow & { updated_at: string }) | undefined>;
  notes: Record<string, { body: string; updated_at: string } | undefined>;
  commentCounts: Record<string, number>;
  cycles: Record<number, { start_date: string; updated_at: string; row: CycleRow } | undefined>;
}

/** before/after are only for the preview: a day (with notes when they're part of the change), a cycle row, or null. */
export interface ItemResult { target: string; ops: Op[]; problems: string[]; warnings: string[]; before: unknown; after: unknown }

export type Seen = { days: Record<string, string | null>; notes: Record<string, string | null>; cycles: Record<string, string> };

export type DayPreview = DayRow & { notes?: string | null };
export type NotesPreview = { notes: string | null };

export const MAX_CHANGES = 100;

const isDate = (s: unknown): s is string => typeof s === 'string' && isRealDate(s);

/** Deep equality that ignores key order and keys set to undefined. */
export function same(a: unknown, b: unknown): boolean {
  return stable(a) === stable(b);
}
function stable(v: unknown): string {
  return JSON.stringify(v, (_k, x) =>
    x && typeof x === 'object' && !Array.isArray(x)
      ? Object.fromEntries(Object.keys(x).sort().filter((k) => x[k] !== undefined).map((k) => [k, x[k]]))
      : x,
  );
}

const asObj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});

export function validateChanges(changes: unknown, ctx: ChangeContext): { items: ItemResult[]; ok: boolean; seen: Seen } {
  const seen: Seen = { days: {}, notes: {}, cycles: {} };
  const batchProblem = (msg: string) => ({ items: [{ target: 'changes', ops: [], problems: [msg], warnings: [], before: null, after: null }], ok: false, seen });
  if (!Array.isArray(changes)) return batchProblem('The changes must be a list.');
  if (changes.length === 0) return batchProblem('There are no changes to preview.');
  if (changes.length > MAX_CHANGES) return batchProblem(`Too many changes: ${changes.length} (the most at once is ${MAX_CHANGES}). Split them into smaller batches.`);

  const items: ItemResult[] = [];
  const targets = new Set<string>();
  for (const [i, raw] of changes.entries()) {
    const c = asObj(raw);
    const item = checkOne(c, i + 1, ctx);
    if (targets.has(item.target)) item.problems.push(`${item.target} is changed more than once in this batch. Put it all in one change.`);
    targets.add(item.target);
    items.push(item);
  }

  for (const item of items) {
    for (const op of item.ops) {
      if (op.op === 'put_day' || op.op === 'delete_day' || op.op === 'put_notes') {
        seen.days[op.date] = ctx.days[op.date]?.updated_at ?? null;
        seen.notes[op.date] = ctx.notes[op.date]?.updated_at ?? null;
      } else if (op.op === 'update_cycle' || op.op === 'delete_cycle') {
        seen.cycles[String(op.id)] = ctx.cycles[op.id]!.updated_at;
      }
    }
  }
  return { items, ok: items.every((i) => i.problems.length === 0), seen };
}

function checkOne(c: Record<string, unknown>, n: number, ctx: ChangeContext): ItemResult {
  switch (c.kind) {
    case 'put_day':
    case 'delete_day':
    case 'put_coach_notes':
      return checkDayChange(c, n, ctx);
    case 'create_cycle':
    case 'update_cycle':
    case 'delete_cycle':
      return checkCycleChange(c, n, ctx);
    default:
      return { target: `change ${n}`, ops: [], problems: [`Change ${n}: unknown kind "${String(c.kind)}".`], warnings: [], before: null, after: null };
  }
}

function checkDayChange(c: Record<string, unknown>, n: number, ctx: ChangeContext): ItemResult {
  const date = c.date;
  if (!isDate(date)) return { target: `change ${n}`, ops: [], problems: [`Change ${n}: the date must be a real date, YYYY-MM-DD.`], warnings: [], before: null, after: null };
  const item: ItemResult = { target: `day ${date}`, ops: [], problems: [], warnings: [], before: null, after: null };
  const problem = (msg: string) => item.problems.push(msg);
  if (date <= ctx.today) problem(`${date} is not in the future. Only days after today (${ctx.today}) can be changed.`);
  const existing = ctx.days[date];
  const oldNotes = ctx.notes[date]?.body ?? null;
  const existingRow: DayRow | null = existing ? { title: existing.title, focus: existing.focus, why: existing.why, parts: existing.parts, status: existing.status } : null;

  if (c.kind === 'delete_day') {
    if (!existing) problem(`There is no workout on ${date} to delete.`);
    const comments = ctx.commentCounts[date] ?? 0;
    if (comments > 0) problem(`${date} has ${comments} member comment${comments === 1 ? '' : 's'}, so it can't be deleted. Change the workout instead.`);
    item.before = existingRow;
    item.ops.push({ op: 'delete_day', date });
    return item;
  }

  if (!isWeekday(date)) problem(`${date} is a weekend. Classes run Monday to Friday.`);

  if (c.kind === 'put_coach_notes') {
    if (!existing) problem(`There is no workout on ${date}, so it can't have coach notes. Add the workout first (put_day with coach_notes).`);
    if (typeof c.body !== 'string') problem(`${date}: coach notes "body" must be text. Send "" to clear the notes.`);
    const body = cleanNotes(c.body, date, item);
    item.before = { notes: oldNotes } satisfies NotesPreview;
    item.after = { notes: body } satisfies NotesPreview;
    if (body !== oldNotes) item.ops.push({ op: 'put_notes', date, body });
    return item;
  }

  // put_day. Focus and why left out keep what the day has (blank for a new day).
  const fields = cleanWorkoutFields({ title: c.title, focus: c.focus ?? existing?.focus, why: c.why ?? existing?.why });
  const checked = checkParts(c.parts);
  item.problems.push(...fields.problems.map((p) => `${date}: ${p}`), ...checked.problems.map((p) => `${date}: ${p}`));
  item.warnings.push(...fields.warnings, ...checked.warnings);
  if (c.status !== undefined && c.status !== 'draft' && c.status !== 'published') problem(`${date}: status must be "draft" or "published".`);
  const parts = checked.parts ?? [];
  const gentle = gentleChoices(ctx.lifts);
  parts.forEach((p, i) => {
    if (!p.lift) return;
    if (!ctx.lifts.includes(p.lift.movement)) problem(`${date} part ${i + 1}: "${p.lift.movement}" is not on the lift list (${ctx.lifts.join(', ')}).`);
    if (p.lift.gentleMovement !== undefined && !gentle.includes(p.lift.gentleMovement))
      problem(`${date} part ${i + 1}: Gentle movement "${p.lift.gentleMovement}" is not one of: ${gentle.join(', ')}.`);
  });
  const status: Status = c.status === 'draft' || c.status === 'published' ? c.status : existing?.status ?? 'published';
  const row: DayRow = { title: fields.title, focus: fields.focus, why: fields.why, parts, status };
  const op: Op = { op: 'put_day', date, row };
  const before: DayPreview | null = existingRow ? { ...existingRow } : null;
  const after: DayPreview = { ...row };
  if (c.coach_notes !== undefined) {
    // null means no notes, as get_days shows a day without them: same as "".
    if (c.coach_notes !== null && typeof c.coach_notes !== 'string') problem(`${date}: coach_notes must be text. Send "" to clear the notes, or leave it out to keep them.`);
    op.notes = cleanNotes(c.coach_notes, date, item);
    after.notes = op.notes;
    if (before) before.notes = oldNotes;
  }
  item.before = before;
  item.after = after;
  if (!before || !same(before, after)) item.ops.push(op);
  return item;
}

/** Cleaned notes, or null when blank. Warns when the text is cut. */
function cleanNotes(raw: unknown, date: string, item: ItemResult): string | null {
  if (typeof raw === 'string' && raw.replace(/\r\n?/g, '\n').trim().length > COACH_NOTES_MAX)
    item.warnings.push(`${date}: coach notes cut to ${COACH_NOTES_MAX} characters`);
  return cleanCoachNotes(raw) || null;
}

function checkCycleChange(c: Record<string, unknown>, n: number, ctx: ChangeContext): ItemResult {
  if (c.kind === 'create_cycle') {
    const plan = asObj(c.plan);
    const start = String(plan.start_date ?? '');
    const item: ItemResult = { target: `new cycle starting ${start}`, ops: [], problems: [], warnings: [], before: null, after: null };
    if (isDate(start) && start <= ctx.today) item.problems.push(`The new cycle starts ${start}. A new cycle has to start after today (${ctx.today}).`);
    const row = checkPlan(plan, ctx, item, 'The new cycle');
    if (row) {
      item.after = row;
      item.ops.push({ op: 'create_cycle', row });
    }
    return item;
  }

  const id = c.id;
  if (typeof id !== 'number' || !Number.isInteger(id)) return { target: `change ${n}`, ops: [], problems: [`Change ${n}: the cycle id must be a number.`], warnings: [], before: null, after: null };
  const item: ItemResult = { target: `cycle ${id}`, ops: [], problems: [], warnings: [], before: null, after: null };
  const existing = ctx.cycles[id];
  if (!existing) {
    item.problems.push(`There is no cycle ${id}.`);
    return item;
  }
  item.before = existing.row;
  const started = existing.start_date <= ctx.today;

  if (c.kind === 'delete_cycle') {
    if (started) item.problems.push(`Cycle ${id} started on ${existing.start_date}, so it can't be deleted.`);
    item.ops.push({ op: 'delete_cycle', id });
    return item;
  }

  // update_cycle
  const plan = asObj(c.plan);
  const start = String(plan.start_date ?? '');
  if (started && start !== existing.start_date)
    item.problems.push(`Cycle ${id} started on ${existing.start_date}, so its start date can't change.`);
  else if (!started && isDate(start) && start <= ctx.today)
    item.problems.push(`Cycle ${id} would start ${start}. It has to start after today (${ctx.today}).`);
  const row = checkPlan(plan, ctx, item, `Cycle ${id}`);
  if (row) {
    item.after = row;
    if (!same(row, existing.row)) item.ops.push({ op: 'update_cycle', id, row });
  }
  return item;
}

/** Checks the day lifts (cleanPlan would quietly drop unknown ones), then cleans the plan. */
function checkPlan(plan: Record<string, unknown>, ctx: ChangeContext, item: ItemResult, where: string): CycleRow | null {
  const days = asObj(plan.days);
  const gentle = gentleChoices(ctx.lifts);
  for (const { n, long } of WEEKDAYS) {
    if (!days[n] || typeof days[n] !== 'object') {
      item.problems.push(`${where}: ${long} is missing from the plan's days.`);
      continue;
    }
    const d = asObj(days[n]);
    if (!STYLES.includes(d.style as never)) item.problems.push(`${where}, ${long}: unknown style "${String(d.style)}" (use ${STYLES.join(', ')}).`);
    if (d.skill != null && d.skill !== 'pullup') item.problems.push(`${where}, ${long}: unknown skill "${String(d.skill)}" (use "pullup" or null).`);
    if (d.lift != null && !ctx.lifts.includes(String(d.lift))) item.problems.push(`${where}, ${long}: "${String(d.lift)}" is not on the lift list (${ctx.lifts.join(', ')}).`);
    if (d.gentle != null && !gentle.includes(String(d.gentle))) item.problems.push(`${where}, ${long}: Gentle movement "${String(d.gentle)}" is not one of: ${gentle.join(', ')}.`);
  }
  const { plan: clean, error } = cleanPlan(plan as unknown as PlanDraft, ctx.lifts);
  if (error || !clean) {
    item.problems.push(`${where}: ${error ?? 'the plan is not valid.'}`);
    return null;
  }
  const long = (v: unknown, max: number) => String(v ?? '').trim().length > max;
  if (long(plan.name, 80)) item.warnings.push(`${where}: name cut to 80 characters`);
  if (long(plan.why, 1500)) item.warnings.push(`${where}: "why" cut to 1500 characters`);
  if (long(plan.brief, 1500)) item.warnings.push(`${where}: brief cut to 1500 characters`);
  const goals = Array.isArray(plan.goals) ? plan.goals.map((g) => String(g ?? '').trim()).filter(Boolean) : [];
  if (goals.some((g) => g.length > 60)) item.warnings.push(`${where}: goals cut to 60 characters each`);
  if (goals.length > 8) item.warnings.push(`${where}: only the first 8 goals kept`);
  for (const { n, long: day } of WEEKDAYS) {
    const d = asObj(days[n]);
    if (long(d.focus, 60)) item.warnings.push(`${where}, ${day}: focus cut to 60 characters`);
    if (long(d.notes, 200)) item.warnings.push(`${where}, ${day}: notes cut to 200 characters`);
  }
  return { start_date: clean.start_date, week_count: clean.weeks.length, name: clean.name, why: clean.why, brief: clean.brief, goals: clean.goals, weeks: clean.weeks, days: clean.days };
}
