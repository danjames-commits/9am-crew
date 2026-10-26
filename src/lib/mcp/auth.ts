// Turns a bearer token (issued by Supabase Auth's OAuth server) into a caller,
// but only for approved admins. Everything else is turned away.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_JWKS } from '../supabase/jwks';

export type McpCaller = { supabase: SupabaseClient; userId: string };

type Deps = {
  verify?: (token: string) => Promise<string | null>;
  client?: (token: string) => SupabaseClient;
};

function makeClient(token: string): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: 'Bearer ' + token } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function verifyToken(token: string): Promise<string | null> {
  const { data } = await makeClient(token).auth.getClaims(token, { jwks: SUPABASE_JWKS });
  return data?.claims?.sub ?? null;
}

export async function adminFromToken(token: string | undefined, deps: Deps = {}): Promise<McpCaller | null> {
  if (!token) return null;
  const verify = deps.verify ?? verifyToken;
  const client = deps.client ?? makeClient;
  try {
    const sub = await verify(token);
    if (!sub) return null;
    const supabase = client(token);
    const { data, error } = await supabase.from('profiles').select('is_admin, approved').eq('id', sub).single();
    if (error) console.error('MCP auth profile lookup failed', error);
    if (!data?.is_admin || !data?.approved) return null;
    return { supabase, userId: sub };
  } catch (e) {
    console.error('MCP auth failed', e);
    return null;
  }
}
