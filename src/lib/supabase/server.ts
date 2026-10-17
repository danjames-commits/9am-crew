import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import type { Profile } from '../types';

export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Called from a server component: the proxy refreshes cookies instead.
        }
      },
    },
  });
}

// Looked up once per request, however many layouts and pages ask.
const getMember = cache(async () => {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect('/login');
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, level, is_admin, approved, animal')
    .eq('id', userId)
    .single<Profile>();
  if (!profile) redirect('/login');
  if (!profile.approved) redirect('/waiting');
  return { supabase, me: profile };
});

/** The signed-in member. Sends people who aren't signed in to /login and
 *  people waiting for approval to /waiting. */
export async function requireMember(opts: { admin?: boolean } = {}) {
  const member = await getMember();
  if (opts.admin && !member.me.is_admin) redirect('/');
  return member;
}
