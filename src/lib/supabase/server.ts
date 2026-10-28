import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { SUPABASE_JWKS } from './jwks';
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
// getClaims checks the token locally, so this costs no round trip.
const getAuth = cache(async () => {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getClaims(undefined, { jwks: SUPABASE_JWKS });
  const userId = data?.claims?.sub;
  if (!userId) redirect('/login');
  return { supabase, userId };
});

const getMember = cache(async () => {
  const { supabase, userId } = await getAuth();
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, level, is_admin, is_coach, approved, animal')
    .eq('id', userId)
    .single<Profile>();
  if (!profile) redirect('/login');
  if (!profile.approved) redirect('/waiting');
  return { supabase, me: profile };
});

/** Signed in, but not yet checked for approval. Lets a page start its own
 *  queries while requireMember() looks up the profile: await both together.
 *  RLS shows nothing to members who aren't approved. */
export async function signedIn() {
  return getAuth();
}

/** The signed-in member. Sends people who aren't signed in to /login and
 *  people waiting for approval to /waiting. */
export async function requireMember(opts: { admin?: boolean; coach?: boolean } = {}) {
  const member = await getMember();
  if (opts.admin && !member.me.is_admin) redirect('/');
  // Coaches run class (coach mode, notes, the gym clock); admins can do all of that too.
  if (opts.coach && !member.me.is_admin && !member.me.is_coach) redirect('/');
  return member;
}
