// The tools the Grok connector can call. Each one acts as the signed-in admin.
import type { McpServer, ServerContext } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { todayLocal } from '../dates';
import { gentleChoices } from '../programming/engine';
import type { McpCaller } from './auth';
import { checkRange, dayView, MAX_RANGE_DAYS, weekdaysBetween, type CycleSpan, type WorkoutRow } from './read';

export function callerOf(ctx: ServerContext): McpCaller {
  const caller = ctx.http?.authInfo?.extra as McpCaller | undefined;
  if (!caller?.supabase || !caller.userId) throw new Error('Not signed in');
  return caller;
}

const text = (value: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }] });

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
}
