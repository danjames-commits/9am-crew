'use client';
import { useEffect, useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { VAPID_PUBLIC_KEY } from '@/lib/push-key';

type State = 'loading' | 'unsupported' | 'install' | 'blocked' | 'off' | 'on';

function keyBytes(base64: string) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const installed = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

/** Turn phone notifications on or off for this device, and pick what to hear about. */
export function NotificationSettings({ isAdmin }: { isAdmin: boolean }) {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [state, setState] = useState<State>('loading');
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [prefs, setPrefs] = useState({ chat: true, signups: true });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        // On an iPhone, notifications only work once the app is on the Home Screen.
        setState(isIOS() && !installed() ? 'install' : 'unsupported');
        return;
      }
      if (Notification.permission === 'denied') return setState('blocked');
      const reg = await navigator.serviceWorker.register('/sw.js');
      const sub = await reg.pushManager.getSubscription();
      if (!sub) return setState('off');
      setEndpoint(sub.endpoint);
      const { data } = await supabase.from('push_subscriptions').select('chat, signups').eq('endpoint', sub.endpoint).maybeSingle();
      if (data) setPrefs({ chat: data.chat, signups: data.signups });
      setState(data ? 'on' : 'off');
    })().catch(() => setState('unsupported'));
  }, [supabase]);

  async function turnOn() {
    setBusy(true);
    setError('');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'blocked' : 'off');
        return;
      }
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) }));
      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({ endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth, chat: prefs.chat, signups: prefs.signups }, { onConflict: 'endpoint' });
      if (error) throw error;
      setEndpoint(json.endpoint);
      setState('on');
    } catch {
      setError('Couldn’t turn notifications on. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      if (endpoint) await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
      setState('off');
    } finally {
      setBusy(false);
    }
  }

  async function setPref(key: 'chat' | 'signups', on: boolean) {
    setPrefs((p) => ({ ...p, [key]: on }));
    if (endpoint) await supabase.from('push_subscriptions').update({ [key]: on }).eq('endpoint', endpoint);
  }

  return (
    <div className="card stack">
      <h2>Notifications</h2>
      {state === 'loading' && <p className="muted small">Checking this phone…</p>}
      {state === 'install' && (
        <p className="muted">
          On an iPhone, notifications work once 9AM Crew is on your Home Screen (see below). Open it from there, come back here, and turn them on.
        </p>
      )}
      {state === 'unsupported' && <p className="muted">This browser can’t show notifications. On an iPhone, add the app to your Home Screen first.</p>}
      {state === 'blocked' && (
        <p className="muted">Notifications are blocked for 9AM Crew. Turn them on in your phone’s Settings (Notifications → 9AM Crew), then come back.</p>
      )}
      {state === 'off' && (
        <>
          <p className="muted">Get a heads-up on this phone when someone posts in the chat{isAdmin ? ', and when someone signs up' : ''}.</p>
          <button type="button" className="btn primary" disabled={busy} onClick={turnOn}>
            {busy ? 'Turning on…' : 'Turn on notifications'}
          </button>
        </>
      )}
      {state === 'on' && (
        <>
          <label className="toggle-row row" style={{ gap: 12 }}>
            <span className="grow">
              <b>Chat messages</b>
              <br />
              <span className="muted small">One heads-up when there’s something new, not one per message.</span>
            </span>
            <input type="checkbox" checked={prefs.chat} onChange={(e) => setPref('chat', e.target.checked)} />
          </label>
          {isAdmin && (
            <label className="toggle-row row" style={{ gap: 12 }}>
              <span className="grow">
                <b>New sign-ups</b>
                <br />
                <span className="muted small">When someone is waiting for approval.</span>
              </span>
              <input type="checkbox" checked={prefs.signups} onChange={(e) => setPref('signups', e.target.checked)} />
            </label>
          )}
          <button type="button" className="btn ghost small" disabled={busy} onClick={turnOff} style={{ alignSelf: 'flex-start' }}>
            Turn off on this phone
          </button>
        </>
      )}
      {error && (
        <p className="small" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
