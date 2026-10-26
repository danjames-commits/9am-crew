// The tools the Grok connector can call. Each one acts as the signed-in admin.
import type { McpServer, ServerContext } from '@modelcontextprotocol/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { todayLocal } from '../dates';
import { gentleChoices } from '../programming/engine';
import type { McpCaller } from './auth';
import { MAX_CHANGES, validateChanges, type Change } from './changes';
import { loadContext } from './context';
import { previewText } from './diff';
import { checkRange, dayView, MAX_RANGE_DAYS, weekdaysBetween, type CycleSpan, type WorkoutRow } from './read';

export function callerOf(ctx: ServerContext): McpCaller {
  const caller = ctx.http?.authInfo?.extra as McpCaller | undefined;
  if (!caller?.supabase || !caller.userId) throw new Error('Not signed in');
  return caller;
}

const text = (value: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }] });

const failure = (message: string) => ({ isError: true, ...text({ ok: false, text: message }) });

const status = z.enum(['draft', 'published']);
// Loose on purpose: validateChanges and checkParts explain problems more clearly than zod.
const plan = z
  .object({
    start_date: z.string().describe('YYYY-MM-DD, a Monday'),
    name: z.string(),
    why: z.string(),
    brief: z.string(),
    goals: z.array(z.string()),
    weeks: z.array(z.record(z.string(), z.unknown())),
    days: z.record(z.string(), z.unknown()).describe('Keyed "1" (Monday) to "5" (Friday)'),
  })
  .describe('A whole cycle plan, as get_cycle returns it');
const change = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('put_day'),
    date: z.string().describe('YYYY-MM-DD, a future weekday'),
    title: z.string(),
    focus: z.string().optional(),
    why: z.string().optional(),
    parts: z.unknown().describe('The whole list of parts for the day, as get_days returns it'),
    status: status.optional(),
    coach_notes: z.string().nullable().optional().describe('Leave out to keep the notes, "" to clear them'),
  }),
  z.object({ kind: z.literal('delete_day'), date: z.string() }),
  z.object({ kind: z.literal('put_coach_notes'), date: z.string(), body: z.string().describe('"" clears the notes') }),
  z.object({ kind: z.literal('create_cycle'), plan }),
  z.object({ kind: z.literal('update_cycle'), id: z.number().int(), plan }),
  z.object({ kind: z.literal('delete_cycle'), id: z.number().int() }),
]);

/** "put_day ×12, put_coach_notes ×3" */
function summarize(changes: Change[]): string {
  const counts = new Map<string, number>();
  for (const c of changes) counts.set(c.kind, (counts.get(c.kind) ?? 0) + 1);
  return [...counts].map(([k, n]) => `${k} ×${n}`).join(', ');
}

type Touched = { set_id: number; days: string[]; cycles: number[] };
const touchedText = (verb: string, t: Touched) =>
  [`${verb} change set ${t.set_id}.`, t.days.length ? `Days: ${t.days.join(', ')}.` : '', t.cycles.length ? `Cycles: ${t.cycles.join(', ')}.` : ''].filter(Boolean).join(' ');

type WeekRow = { kind: string; label: string; pct: number; sets: number; reps: number };

export function registerTools(server: McpServer): void {
  server.registerTool(
    'list_cycles',
    {
      title: 'List cycles',
      description: 'List all programming cycles with their goals and a one-line summary of each week.',
      inputSchema: z.object({}),
    },
    async (_args, ctx) => {
      const { supabase } = callerOf(ctx);
      const { data, error } = await supabase
        .from('cycles')
        .select('id, name, start_date, end_date, week_count, goals, weeks')
        .order('start_date');
      if (error) throw new Error(error.message);
      return text(
        (data ?? []).map((c) => ({
          ...c,
          weeks: ((c.weeks ?? []) as WeekRow[]).map((w) => `${w.kind} ${w.label} ${w.pct}% ${w.sets}×${w.reps}`),
        })),
      );
    },
  );

  server.registerTool(
    'get_cycle',
    {
      title: 'Get cycle',
      description: 'Get one programming cycle in full, including its per-weekday plan (days).',
      inputSchema: z.object({ id: z.number().int().describe('Cycle id from list_cycles') }),
    },
    async ({ id }, ctx) => {
      const { supabase } = callerOf(ctx);
      const { data, error } = await supabase.from('cycles').select('*').eq('id', id).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return { isError: true, content: [{ type: 'text' as const, text: `No cycle with id ${id}.` }] };
      return text(data);
    },
  );

  server.registerTool(
    'get_days',
    {
      title: 'Get days',
      description: `Get the workout for each class day (Mon-Fri) from..to inclusive, including empty days. At most ${MAX_RANGE_DAYS} days. "editable" is true only for dates after today.`,
      inputSchema: z.object({
        from: z.string().describe('Start date, YYYY-MM-DD'),
        to: z.string().describe('End date, YYYY-MM-DD'),
      }),
    },
    async ({ from, to }, ctx) => {
      const bad = checkRange(from, to);
      if (bad) return { isError: true, content: [{ type: 'text' as const, text: bad }] };
      const { supabase } = callerOf(ctx);
      const [w, n, c] = await Promise.all([
        supabase.from('workouts').select('class_date, title, focus, why, parts, status, updated_at').gte('class_date', from).lte('class_date', to),
        supabase.from('workout_coach_notes').select('class_date, body').gte('class_date', from).lte('class_date', to),
        supabase.from('cycles').select('id, name, start_date, end_date'),
      ]);
      const failed = w.error ?? n.error ?? c.error;
      if (failed) throw new Error(failed.message);
      const rows = new Map(((w.data ?? []) as WorkoutRow[]).map((r) => [r.class_date, r]));
      const notes = new Map((n.data ?? []).map((r: { class_date: string; body: string }) => [r.class_date, r.body]));
      const today = todayLocal();
      return text(weekdaysBetween(from, to).map((d) => dayView(rows.get(d) ?? null, d, notes.get(d) ?? null, (c.data ?? []) as CycleSpan[], today)));
    },
  );

  server.registerTool(
    'list_movements',
    {
      title: 'List movements',
      description: 'The lifts the gym tracks, and the gentle alternatives (lifts plus easier options) allowed for easier versions.',
      inputSchema: z.object({}),
    },
    async (_args, ctx) => {
      const { supabase } = callerOf(ctx);
      const { data, error } = await supabase.from('movements').select('name').order('sort');
      if (error) throw new Error(error.message);
      const lifts = (data ?? []).map((m: { name: string }) => m.name);
      return text({ lifts, gentle: gentleChoices(lifts) });
    },
  );

  server.registerTool(
    'preview_changes',
    {
      title: 'Preview changes',
      description:
        'Check a batch of changes to future workout days, coach notes or cycles and save it as a preview. Nothing changes in the app. Always show the returned preview text to the coach and wait for them to say push before calling push_changes. Send whole days and whole cycle plans: read them first with get_days or get_cycle, edit, and send back. Leave coach_notes out to keep a day\'s notes as they are.',
      inputSchema: z.object({ changes: z.array(change).max(MAX_CHANGES) }),
    },
    async ({ changes }, ctx) => {
      const caller = callerOf(ctx);
      const list = changes as Change[];
      const result = validateChanges(list, await loadContext(caller, list));
      const ops = result.items.flatMap((i) => i.ops);
      const preview = previewText(result.items);
      if (result.ok && ops.length === 0) {
        return text({ change_set_id: null, ok: true, text: `${preview}\n\nNothing to push — every item is unchanged.` });
      }
      const { data, error } = await caller.supabase
        .from('mcp_change_sets')
        .insert({ status: result.ok ? 'preview' : 'invalid', summary: summarize(list), ops, seen: result.seen })
        .select('id')
        .single();
      if (error) return failure(error.message);
      const tail = result.ok ? '' : "\n\nFix the problems marked ✗ and preview again. This preview can't be pushed.";
      return text({ change_set_id: data.id, ok: result.ok, text: preview + tail });
    },
  );

  server.registerTool(
    'push_changes',
    {
      title: 'Push changes',
      description: 'Apply a preview the coach has seen and approved. Only call this after the coach explicitly says to push. Applies all changes or none.',
      inputSchema: z.object({ change_set_id: z.number().int().describe('The id preview_changes returned') }),
    },
    async ({ change_set_id }, ctx) => {
      const { supabase } = callerOf(ctx);
      const { data, error } = await supabase.rpc('mcp_push', { set_id: change_set_id });
      if (error) return failure(error.message);
      revalidatePath('/', 'layout');
      return text({ ok: true, text: touchedText('Pushed', data as Touched) });
    },
  );

  server.registerTool(
    'undo_push',
    {
      title: 'Undo push',
      description: 'Reverse a push. With no id, reverses the most recent push. Refuses if a changed day was edited again since.',
      inputSchema: z.object({ change_set_id: z.number().int().optional().describe('The pushed change set; leave out for the most recent push') }),
    },
    async ({ change_set_id }, ctx) => {
      const { supabase } = callerOf(ctx);
      const { data, error } = await supabase.rpc('mcp_undo', { set_id: change_set_id ?? null });
      if (error) return failure(error.message);
      revalidatePath('/', 'layout');
      return text({ ok: true, text: touchedText('Undid', data as Touched) });
    },
  );

  server.registerTool(
    'list_pushes',
    {
      title: 'List pushes',
      description: 'Recent pushes and previews, newest first.',
      inputSchema: z.object({ limit: z.number().int().min(1).max(50).optional().describe('How many, default 10') }),
    },
    async ({ limit }, ctx) => {
      const { supabase } = callerOf(ctx);
      const { data, error } = await supabase
        .from('mcp_change_sets')
        .select('id, status, summary, created_at, pushed_at, undone_at')
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(limit ?? 10);
      if (error) throw new Error(error.message);
      return text(data ?? []);
    },
  );
}
