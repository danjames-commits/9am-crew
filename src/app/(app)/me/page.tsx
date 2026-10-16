import { requireMember } from '@/lib/supabase/server';
import { MeForm } from '@/components/MeForm';
import { svgVersion } from '@/lib/svg-clean';
import { signOut } from '@/app/actions';

export default async function MePage() {
  const { supabase, me } = await requireMember();
  const { data: drawn } = await supabase.from('avatars').select('name, prompt, svg').eq('user_id', me.id).maybeSingle();
  return (
    <main className="screen">
      <MeForm id={me.id} name={me.display_name} level={me.level} animal={me.animal ?? null} drawn={drawn ? { name: drawn.name, prompt: drawn.prompt, version: svgVersion(drawn.svg) } : null} />
      <div className="card stack">
        <h2>Put it on your home screen</h2>
        <p className="muted">
          iPhone: open this site in Safari, tap the Share button, then “Add to Home Screen”. Android: open the Chrome menu and tap “Add to Home
          screen” or “Install app”.
        </p>
      </div>
      <p className="muted small" style={{ textAlign: 'center' }}>
        Ready-made animals from <a href="https://github.com/jdecked/twemoji">Twemoji</a>, CC-BY 4.0. Drawn ones by Claude.
      </p>
      <form action={signOut}>
        <button className="btn ghost block">Sign out</button>
      </form>
    </main>
  );
}
