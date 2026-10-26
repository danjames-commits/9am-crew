// The tools the Grok connector can call. Each one acts as the signed-in admin.
import type { McpServer } from '@modelcontextprotocol/server';
import type { McpCaller } from './auth';

type Ctx = { http?: { authInfo?: { extra?: Record<string, unknown> } } };

export function callerOf(ctx: Ctx): McpCaller {
  const caller = ctx.http?.authInfo?.extra as McpCaller | undefined;
  if (!caller?.supabase || !caller.userId) throw new Error('Not signed in');
  return caller;
}

const text = (value: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }] });

type WeekRow = { kind: string; label: string; pct: number; sets: number; reps: number };

export function registerTools(server: McpServer): void {
  server.registerTool(
    'list_cycles',
    { title: 'List cycles', description: 'List all programming cycles with their goals and a one-line summary of each week.' },
    async (_args: unknown, ctx: Ctx) => {
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
}
