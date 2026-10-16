'use client';
import { useState, useTransition } from 'react';
import { updateMe } from '@/app/actions';
import { LEVELS } from '@/lib/types';
import { ANIMALS } from '@/lib/animals';
import { Avatar } from './Avatar';

export function MeForm({ id, name, level, animal }: { id: string; name: string; level: number; animal: string | null }) {
  const [displayName, setDisplayName] = useState(name);
  const [lvl, setLvl] = useState(level);
  const [pick, setPick] = useState<string | null>(animal);
  const chosen = ANIMALS.find((a) => a.id === pick);
  const [msg, setMsg] = useState<{ ok?: boolean; error?: string } | null>(null);
  const [pending, start] = useTransition();

  function save(e: React.FormEvent) {
    e.preventDefault();
    start(async () => setMsg(await updateMe({ display_name: displayName, level: lvl, animal: pick })));
  }

  return (
    <form onSubmit={save} className="stack loose">
      <label className="field">
        Name the crew sees
        <input type="text" value={displayName} maxLength={40} required onChange={(e) => setDisplayName(e.target.value)} />
      </label>
      <fieldset className="stack" style={{ border: 'none', padding: 0, margin: 0 }}>
        <legend className="eyebrow" style={{ marginBottom: 10 }}>
          My spirit animal
        </legend>
        <div className="card row">
          <Avatar id={id} name={displayName || name} animal={pick} size="lg" />
          <div className="grow">
            <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 19 }}>{chosen ? chosen.name : 'Just initials'}</div>
            <div className="muted">{chosen ? chosen.vibe : 'Pick an animal below. Your initials stay on it so the crew knows it’s you.'}</div>
          </div>
        </div>
        <p className="muted small">Mid-energy animals only. No lions, no bears. We’re here at 9am, not 5am.</p>
        <div className="animal-grid" role="radiogroup" aria-label="Spirit animal">
          <button type="button" role="radio" aria-checked={pick === null} className={pick === null ? 'on' : ''} onClick={() => setPick(null)}>
            <span className="animal-none">AB</span>
            <span>None</span>
          </button>
          {ANIMALS.map((a) => (
            <button key={a.id} type="button" role="radio" aria-checked={pick === a.id} className={pick === a.id ? 'on' : ''} onClick={() => setPick(a.id)} title={a.vibe}>
              <img src={`/animals/${a.id}.svg`} alt="" width={36} height={36} />
              <span>{a.name}</span>
            </button>
          ))}
        </div>
      </fieldset>
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
