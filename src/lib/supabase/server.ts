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

/** The signed-in member. Sends people who aren't signed in to /login and
 *  people waiting for approval to /waiting. */
export const requireMember = cache(async (opts: { admin?: boolean } = {}) => {
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
  if (opts.admin && !profile.is_admin) redirect('/');
  return { supabase, me: profile };
});
