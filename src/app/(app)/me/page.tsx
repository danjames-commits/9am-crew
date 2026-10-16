import Link from 'next/link';
import { requireMember } from '@/lib/supabase/server';
import { MeForm } from '@/components/MeForm';
import { Icon } from '@/components/Icon';
import { signOut } from '@/app/actions';

export default async function MePage() {
  const { me } = await requireMember();
  return (
    <main className="screen">
      <div className="row">
        <Link href="/" className="avatar" style={{ background: '#fff', color: 'var(--ink)' }} aria-label="Back">
          <Icon name="back" />
        </Link>
        <h1 style={{ fontSize: 28 }}>Me</h1>
      </div>
      <MeForm id={me.id} name={me.display_name} level={me.level} animal={me.animal ?? null} />
      <div className="card stack">
        <h2>Put it on your home screen</h2>
        <p className="muted">
          iPhone: open this site in Safari, tap the Share button, then “Add to Home Screen”. Android: open the Chrome menu and tap “Add to Home
          screen” or “Install app”.
        </p>
      </div>
      <p className="muted small" style={{ textAlign: 'center' }}>
        Animal art from <a href="https://github.com/jdecked/twemoji">Twemoji</a>, CC-BY 4.0.
      </p>
      <form action={signOut}>
        <button className="btn ghost block">Sign out</button>
      </form>
    </main>
  );
}
