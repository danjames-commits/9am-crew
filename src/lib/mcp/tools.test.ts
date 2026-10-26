import { describe, expect, it, vi } from 'vitest';
import { McpServer, type RegisteredTool, type ServerContext } from '@modelcontextprotocol/server';
import { registerTools } from './tools';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

describe('list_cycles', () => {
  it('runs through the SDK executor and returns the cycle names', async () => {
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerTools(server);
    const tool = (server as unknown as { _registeredTools: Record<string, RegisteredTool> })._registeredTools['list_cycles'];

    const row = { id: 'c1', name: 'Autumn Strength', start_date: '2026-09-01', end_date: '2026-10-01', week_count: 1, goals: [], weeks: [] };
    const supabase = { from: () => ({ select: () => ({ order: async () => ({ data: [row], error: null }) }) }) };
    const ctx = { http: { authInfo: { extra: { supabase, userId: 'u1' } } } } as unknown as ServerContext;

    const result = (await tool.executor({}, ctx)) as { content: { text: string }[] };
    expect(result.content[0].text).toContain('Autumn Strength');
  });
});

describe('get_days', () => {
  const setup = () => {
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerTools(server);
    const tool = (server as unknown as { _registeredTools: Record<string, RegisteredTool> })._registeredTools['get_days'];
    const tables: Record<string, unknown[]> = {
      workouts: [{ class_date: '2999-11-04', title: 'Heavy day', focus: 'Squat', why: 'x', parts: [], status: 'draft', updated_at: '2999-01-01T00:00:00Z' }],
      workout_coach_notes: [{ class_date: '2999-11-04', body: 'go easy' }],
      cycles: [{ id: 1, name: 'Autumn', start_date: '2999-11-02', end_date: '2999-12-11' }],
    };
    const q = (t: string) => ({ select: () => ({ gte: () => ({ lte: async () => ({ data: tables[t], error: null }) }), then: (r: (v: unknown) => void) => r({ data: tables[t], error: null }) }) });
    const supabase = { from: q };
    const ctx = { http: { authInfo: { extra: { supabase, userId: 'u1' } } } } as unknown as ServerContext;
    return { tool, ctx };
  };

  it('returns a view per weekday including empty days', async () => {
    const { tool, ctx } = setup();
    // 2999-11-03 is a Sunday: skipped.
    const result = (await tool.executor({ from: '2999-11-03', to: '2999-11-06' }, ctx)) as { content: { text: string }[] };
    const days = JSON.parse(result.content[0].text);
    expect(days.map((d: { date: string; exists: boolean }) => [d.date, d.exists])).toEqual([
      ['2999-11-04', true],
      ['2999-11-05', false],
      ['2999-11-06', false],
    ]);
    expect(days[0]).toMatchObject({ title: 'Heavy day', coach_notes: 'go easy', editable: true, cycle: { id: 1, name: 'Autumn' } });
  });

  it('returns the range error as an error result', async () => {
    const { tool, ctx } = setup();
    const result = (await tool.executor({ from: '2026-11-02', to: '2027-02-01' }, ctx)) as { isError?: boolean; content: { text: string }[] };
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/70 days/);
  });
});

describe('write tools', () => {
  type Result = { isError?: boolean; content: { text: string }[] };
  const setup = (opts: { rpcError?: string } = {}) => {
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerTools(server);
    const tools = (server as unknown as { _registeredTools: Record<string, RegisteredTool> })._registeredTools;
    const tables: Record<string, unknown[]> = {
      workouts: [{ class_date: '2999-11-04', id: 7, title: 'Heavy day', focus: 'Squat', why: 'x', parts: [], status: 'draft', updated_at: '2999-01-01T00:00:00Z' }],
      workout_coach_notes: [{ class_date: '2999-11-04', body: 'go easy', updated_at: '2999-01-02T00:00:00Z' }],
      comments: [],
      movements: [{ name: 'Back Squat' }],
      cycles: [],
      mcp_change_sets: [{ id: 3, status: 'pushed', summary: 'put_day ×1', created_at: 'x', pushed_at: 'y', undone_at: null }],
    };
    const inserts: { table: string; row: Record<string, unknown> }[] = [];
    const rpcs: { fn: string; args: unknown }[] = [];
    const query = (t: string) => {
      const q: Record<string, unknown> = {};
      for (const m of ['select', 'in', 'eq', 'order', 'limit']) q[m] = () => q;
      q.insert = (row: Record<string, unknown>) => {
        inserts.push({ table: t, row });
        return q;
      };
      q.single = async () => ({ data: { id: 42 }, error: null });
      q.then = (r: (v: unknown) => void) => r({ data: tables[t], error: null });
      return q;
    };
    const supabase = {
      from: query,
      rpc: async (fn: string, args: unknown) => {
        rpcs.push({ fn, args });
        return opts.rpcError ? { data: null, error: { message: opts.rpcError } } : { data: { ok: true, set_id: 42, days: ['2999-11-04'], cycles: [] }, error: null };
      },
    };
    const ctx = { http: { authInfo: { extra: { supabase, userId: 'u1' } } } } as unknown as ServerContext;
    const run = async (name: string, args: unknown) => (await tools[name].executor(args, ctx)) as Result;
    return { run, inserts, rpcs };
  };
  const day = { kind: 'put_day', date: '2999-11-04', title: 'Heavy day', focus: 'Squat', why: 'x', parts: [] };

  it('preview stores a pushable set and returns its id and preview text', async () => {
    const { run, inserts } = setup();
    const out = JSON.parse((await run('preview_changes', { changes: [{ ...day, title: 'Light day' }] })).content[0].text);
    expect(out).toMatchObject({ ok: true, change_set_id: 42 });
    expect(out.text).toContain('title: Heavy day → Light day');
    expect(inserts).toHaveLength(1);
    expect(inserts[0].table).toBe('mcp_change_sets');
    expect(inserts[0].row).toMatchObject({ status: 'preview', summary: 'put_day ×1', seen: { days: { '2999-11-04': '2999-01-01T00:00:00Z' } } });
    expect(inserts[0].row.ops).toEqual([expect.objectContaining({ op: 'put_day', date: '2999-11-04' })]);
  });

  it('preview with problems stores an invalid set and says it cannot be pushed', async () => {
    const { run, inserts } = setup();
    const out = JSON.parse((await run('preview_changes', { changes: [{ ...day, date: '2999-11-09' }] })).content[0].text);
    expect(out.ok).toBe(false);
    expect(out.text).toContain('✗');
    expect(out.text.endsWith("Fix the problems marked ✗ and preview again. This preview can't be pushed.")).toBe(true);
    expect(inserts[0].row.status).toBe('invalid');
  });

  it('preview with nothing changed stores nothing', async () => {
    const { run, inserts } = setup();
    const out = JSON.parse((await run('preview_changes', { changes: [day] })).content[0].text);
    expect(out).toMatchObject({ ok: true, change_set_id: null });
    expect(out.text.endsWith('Nothing to push — every item is unchanged.')).toBe(true);
    expect(inserts).toHaveLength(0);
  });

  it('push calls mcp_push and lists what changed', async () => {
    const { run, rpcs } = setup();
    const res = await run('push_changes', { change_set_id: 42 });
    expect(rpcs).toEqual([{ fn: 'mcp_push', args: { set_id: 42 } }]);
    expect(res.isError).toBeFalsy();
    expect(JSON.parse(res.content[0].text).text).toContain('2999-11-04');
  });

  it('push returns the database error as an error result', async () => {
    const { run } = setup({ rpcError: 'changed since preview: 2999-11-04' });
    const res = await run('push_changes', { change_set_id: 42 });
    expect(res.isError).toBe(true);
    expect(JSON.parse(res.content[0].text)).toEqual({ ok: false, text: 'changed since preview: 2999-11-04' });
  });

  it('undo with no id undoes the latest push', async () => {
    const { run, rpcs } = setup();
    const res = await run('undo_push', {});
    expect(rpcs).toEqual([{ fn: 'mcp_undo', args: { set_id: null } }]);
    expect(res.isError).toBeFalsy();
  });

  it('list_pushes returns the change sets', async () => {
    const { run } = setup();
    const rows = JSON.parse((await run('list_pushes', {})).content[0].text);
    expect(rows[0]).toMatchObject({ id: 3, status: 'pushed', summary: 'put_day ×1' });
  });
});
