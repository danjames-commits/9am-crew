import { describe, expect, it } from 'vitest';
import type { McpCaller } from './auth';
import type { Change } from './changes';
import { loadContext } from './context';

describe('loadContext', () => {
  it('only asks the database about real dates', async () => {
    const asked: { table: string; values: unknown[] }[] = [];
    const query = (table: string) => {
      const q: Record<string, unknown> = {};
      for (const m of ['select', 'order']) q[m] = () => q;
      q.in = (_col: string, values: unknown[]) => {
        asked.push({ table, values });
        // Postgres refuses a date like 2026-02-30 outright, failing the whole query.
        const bad = values.some((v) => v !== '2026-11-05');
        q.then = (r: (v: unknown) => void) => r(bad ? { data: null, error: { message: 'invalid input syntax for type date' } } : { data: [], error: null });
        return q;
      };
      q.then = (r: (v: unknown) => void) => r({ data: [], error: null });
      return q;
    };
    const caller = { supabase: { from: query }, userId: 'u1' } as unknown as McpCaller;
    const changes = [
      { kind: 'delete_day', date: '2026-02-30' },
      { kind: 'delete_day', date: 'next monday' },
      { kind: 'delete_day', date: '2026-11-05' },
    ] as Change[];
    const ctx = await loadContext(caller, changes);
    expect(ctx.days).toEqual({});
    expect(asked.filter((a) => a.table === 'workouts')).toEqual([{ table: 'workouts', values: ['2026-11-05'] }]);
  });

  it('skips the day queries when no date is real', async () => {
    const asked: string[] = [];
    const query = (table: string) => {
      const q: Record<string, unknown> = {};
      for (const m of ['select', 'order']) q[m] = () => q;
      q.in = () => {
        asked.push(table);
        return q;
      };
      q.then = (r: (v: unknown) => void) => r({ data: [], error: null });
      return q;
    };
    const caller = { supabase: { from: query }, userId: 'u1' } as unknown as McpCaller;
    await loadContext(caller, [{ kind: 'delete_day', date: '2026-02-30' }] as Change[]);
    expect(asked).toEqual([]);
  });
});
