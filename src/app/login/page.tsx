'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';

type Mode = 'signin' | 'signup' | 'forgot';

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const nextParam = useSearchParams().get('next');
  // Same rule as auth/callback: only paths on this site.
  const next = nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/';
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  function switchTo(m: Mode) {
    setMode(m);
    setError('');
    setInfo('');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setInfo('');
    const supabase = supabaseBrowser();

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      setBusy(false);
      if (error) return setError('That email and password don’t match. Try again, or reset your password.');
      router.replace(next);
      router.refresh();
      return;
    }

    if (mode === 'signup') {
      if (password.length < 8) {
        setBusy(false);
        return setError('Please use at least 8 characters for your password.');
      }
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { display_name: name.trim() } },
      });
      setBusy(false);
      if (error) return setError(error.message.includes('registered') ? 'That email already has an account. Sign in instead.' : error.message);
      if (!data.session) return setInfo('Check your email to confirm your address, then come back and sign in.');
      router.replace(next);
      router.refresh();
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset`,
    });
    setBusy(false);
    if (error) return setError(error.message);
    setInfo('If that email has an account, a reset link is on its way. Open it on this same device.');
  }

  return (
    <main className="screen no-nav" style={{ paddingTop: 56 }}>
      <div className="stack tight">
        <div className="eyebrow teal">Every weekday · 9:00 AM</div>
        <h1 style={{ fontSize: 44 }}>9AM Crew</h1>
        <p className="muted">Check in, see the workouts, track your lifts.</p>
      </div>

      {mode !== 'forgot' && (
        <div className="segmented" role="group" aria-label="Sign in or create account" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', background: '#e8e7e0' }}>
          <button type="button" aria-pressed={mode === 'signin'} onClick={() => switchTo('signin')}>
            Sign in
          </button>
          <button type="button" aria-pressed={mode === 'signup'} onClick={() => switchTo('signup')}>
            I’m new
          </button>
        </div>
      )}

      <form className="card stack loose" onSubmit={submit}>
        {mode === 'forgot' && (
          <>
            <h2>Reset your password</h2>
            <p className="muted">We’ll email you a link to choose a new one.</p>
          </>
        )}
        {mode === 'signup' && (
          <label className="field">
            Your name
            <input type="text" autoComplete="name" required maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
        )}
        <label className="field">
          Email
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        {mode !== 'forgot' && (
          <label className="field">
            {mode === 'signup' ? 'Choose a password (8 or more characters)' : 'Password'}
            <input
              type="password"
              required
              minLength={mode === 'signup' ? 8 : undefined}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        )}
        <button className="btn primary big" disabled={busy}>
          {busy ? 'One moment…' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create my account' : 'Email me a reset link'}
        </button>
        {mode === 'signin' && (
          <button type="button" className="btn ghost" onClick={() => switchTo('forgot')}>
            Forgot your password?
          </button>
        )}
        {mode === 'forgot' && (
          <button type="button" className="btn ghost" onClick={() => switchTo('signin')}>
            Back to sign in
          </button>
        )}
      </form>

      {error && <div className="notice bad" role="alert">{error}</div>}
      {info && <div className="notice good" role="status">{info}</div>}
      {mode === 'signup' && <p className="muted small center">After you sign up, one of the crew’s admins approves you.</p>}
    </main>
  );
}
