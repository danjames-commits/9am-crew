import { describe, expect, it, vi } from 'vitest';
import { McpServer, type RegisteredTool, type ServerContext } from '@modelcontextprotocol/server';
import { EVIDENCE_RULE, SERVER_INSTRUCTIONS, STANDING_RULES } from './standing-rules';
import { registerTools } from './tools';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const tools = () => {
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerTools(server);
  return (server as unknown as { _registeredTools: Record<string, RegisteredTool> })._registeredTools;
};

describe('evidence-first rule', () => {
  it('is in the standing rules and the server instructions', () => {
    expect(EVIDENCE_RULE).toMatch(/exercise science/);
    expect(STANDING_RULES).toContain(EVIDENCE_RULE);
    expect(SERVER_INSTRUCTIONS).toContain(EVIDENCE_RULE);
  });

  it('is in the descriptions of the tools agents read and write with', () => {
    const t = tools();
    for (const name of ['get_days', 'get_cycle', 'preview_changes']) expect(t[name].description).toContain('Evidence first');
  });

  it('heads every preview result', async () => {
    const t = tools();
    const q: Record<string, unknown> = {};
    for (const m of ['select', 'in', 'eq', 'order', 'limit', 'gte', 'lte', 'insert']) q[m] = () => q;
    q.single = async () => ({ data: { id: 1 }, error: null });
    q.then = (r: (v: unknown) => void) => r({ data: [], error: null });
    const ctx = { http: { authInfo: { extra: { supabase: { from: () => q }, userId: 'u1' } } } } as unknown as ServerContext;
    const res = (await t['preview_changes'].executor({ changes: [{ kind: 'delete_day', date: '2999-11-04' }] }, ctx)) as { content: { text: string }[] };
    expect(JSON.parse(res.content[0].text).text.startsWith(STANDING_RULES)).toBe(true);
  });
});
