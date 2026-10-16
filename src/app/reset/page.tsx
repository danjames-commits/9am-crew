'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';

export default function ResetPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError('Please use at least 8 characters.');
    setBusy(true);
    setError('');
    const { error } = await supabaseBrowser().auth.updateUser({ password });
    setBusy(false);
    if (error) setError(error.message);
    else {
      router.replace('/');
      router.refresh();
    }
  }

  return (
    <main className="screen no-nav" style={{ paddingTop: 56 }}>
      <h1>New password</h1>
      <form className="card stack loose" onSubmit={save}>
        <label className="field">
          Choose a new password (8 or more characters)
          <input type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <button className="btn primary big" disabled={busy}>
          {busy ? 'Saving…' : 'Save and sign in'}
        </button>
      </form>
      {error && <div className="notice bad" role="alert">{error}</div>}
    </main>
  );
}
