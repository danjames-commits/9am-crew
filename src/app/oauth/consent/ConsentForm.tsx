'use client';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

export function ConsentForm({ authorizationId }: { authorizationId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function decide(allow: boolean) {
    setBusy(true);
    setError('');
    const oauth = supabaseBrowser().auth.oauth;
    const options = { skipBrowserRedirect: true };
    const { data, error } = allow ? await oauth.approveAuthorization(authorizationId, options) : await oauth.denyAuthorization(authorizationId, options);
    if (error || !data) {
      setBusy(false);
      return setError('That didn’t work. Start the connection again from the app.');
    }
    window.location.href = data.redirect_url;
  }

  return (
    <>
      <button className="btn primary big" disabled={busy} onClick={() => decide(true)}>Allow</button>
      <button className="btn ghost block" disabled={busy} onClick={() => decide(false)}>Deny</button>
      {error && <div className="notice bad" role="alert">{error}</div>}
    </>
  );
}
