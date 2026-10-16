import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { signOut } from '../actions';

export default async function WaitingPage() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect('/login');
  const { data: me } = await supabase.from('profiles').select('display_name, approved').eq('id', data.claims.sub).single();
  if (me?.approved) redirect('/');

  return (
    <main className="screen no-nav" style={{ paddingTop: 64 }}>
      <h1>Almost there{me?.display_name ? `, ${me.display_name}` : ''}</h1>
      <div className="card stack">
        <p>You’re signed in. One of the crew’s admins needs to approve you before you can see the workouts and chat.</p>
        <p className="muted">Give them a nudge at the gym, then come back here.</p>
      </div>
      <a className="btn primary big" href="/">Check again</a>
      <form action={signOut}>
        <button className="btn ghost block">Sign out</button>
      </form>
    </main>
  );
}
