'use client';
import { useState, useTransition } from 'react';
import { updateMe } from '@/app/actions';
import { LEVELS } from '@/lib/types';

export function MeForm({ name, level }: { name: string; level: number }) {
  const [displayName, setDisplayName] = useState(name);
  const [lvl, setLvl] = useState(level);
  const [msg, setMsg] = useState<{ ok?: boolean; error?: string } | null>(null);
  const [pending, start] = useTransition();

  function save(e: React.FormEvent) {
    e.preventDefault();
    start(async () => setMsg(await updateMe({ display_name: displayName, level: lvl })));
  }

  return (
    <form onSubmit={save} className="stack loose">
      <label className="field">
        Name the crew sees
        <input type="text" value={displayName} maxLength={40} required onChange={(e) => setDisplayName(e.target.value)} />
      </label>
      <fieldset className="stack" style={{ border: 'none', padding: 0, margin: 0 }}>
        <legend className="eyebrow" style={{ marginBottom: 10 }}>
          My level
        </legend>
        {LEVELS.map((l) => (
          <label
            key={l.n}
            className="card row top"
            style={{ cursor: 'pointer', border: `2px solid ${lvl === l.n ? 'var(--ink)' : 'transparent'}` }}
          >
            <input
              type="radio"
              name="level"
              value={l.n}
              checked={lvl === l.n}
              onChange={() => setLvl(l.n)}
              style={{ width: 22, height: 22, minHeight: 0, marginTop: 3, accentColor: 'var(--ink)' }}
            />
            <span className="grow">
              <span style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 19, display: 'block' }}>
                {l.n}. {l.name}
              </span>
              <span className="muted">{l.blurb}</span>
            </span>
          </label>
        ))}
        <p className="muted small">You can still look at any level on a workout. This just picks which one opens first.</p>
      </fieldset>
      <button className="btn primary big" disabled={pending}>
        {pending ? 'Saving…' : 'Save'}
      </button>
      {msg?.ok && <div className="notice good" role="status">Saved.</div>}
      {msg?.error && <div className="notice bad" role="alert">{msg.error}</div>}
    </form>
  );
}
