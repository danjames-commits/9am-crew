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
