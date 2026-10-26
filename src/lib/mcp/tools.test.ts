import { describe, expect, it } from 'vitest';
import { McpServer, type RegisteredTool, type ServerContext } from '@modelcontextprotocol/server';
import { registerTools } from './tools';

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
