import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import { adminFromToken } from '@/lib/mcp/auth';
import { registerTools } from '@/lib/mcp/tools';
import { SERVER_INSTRUCTIONS } from '@/lib/mcp/standing-rules';

export const dynamic = 'force-dynamic';

const handler = createMcpHandler((server) => registerTools(server), { serverInfo: { name: '9am-crew', version: '1.0.0' }, instructions: SERVER_INSTRUCTIONS });

// Only approved admins get in; the proxy leaves this route alone.
const authed = withMcpAuth(
  handler,
  async (_req, token) => {
    const caller = token ? await adminFromToken(token) : null;
    return caller && token ? { token, clientId: 'grok', scopes: [], extra: caller } : undefined;
  },
  { required: true, resourceUrl: 'https://9amcrew.ca' },
);

export { authed as GET, authed as POST, authed as DELETE };
