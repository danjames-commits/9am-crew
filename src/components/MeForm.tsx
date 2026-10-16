'use client';
import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { Icon } from './Icon';
import { drawAvatar, updateMe } from '@/app/actions';
import { LEVELS } from '@/lib/types';
import { ANIMALS, customVersion } from '@/lib/animals';
import { Avatar } from './Avatar';

type Drawing = { prompt: string; name: string; svg: string };

export function MeForm({
  id,
  name,
  level,
  animal,
  drawn,
}: {
  id: string;
  name: string;
  level: number;
  animal: string | null;
  /** Their saved drawing, if they have one. */
  drawn: { name: string; prompt: string; version: string } | null;
}) {
  const [displayName, setDisplayName] = useState(name);
  const [lvl, setLvl] = useState(level);
  const [pick, setPick] = useState<string | null>(customVersion(animal) ? 'custom' : animal);
  const [idea, setIdea] = useState('');
  const [fresh, setFresh] = useState<Drawing | null>(null);
  const [drawNote, setDrawNote] = useState<{ ok?: string; error?: string } | null>(null);
  const [drawing, startDraw] = useTransition();
  const chosen = ANIMALS.find((a) => a.id === pick);
  const freshSrc = fresh ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(fresh.svg)}` : null;
  const savedSrc = drawn ? `/avatar/${id}?v=${drawn.version}` : null;
  const customSrc = freshSrc ?? savedSrc;
  const customName = fresh?.name ?? drawn?.name ?? 'Your own';

  function draw() {
    setDrawNote(null);
    startDraw(async () => {
      const r = await drawAvatar(idea);
      if ('error' in r) return setDrawNote({ error: r.error });
      setFresh(r.drawing);
      setPick('custom');
      setDrawNote({ ok: `${r.message} Press Save to keep it.` });
    });
  }
  const [msg, setMsg] = useState<{ ok?: boolean; error?: string } | null>(null);
  const [pending, start] = useTransition();

  function save(e: React.FormEvent) {
    e.preventDefault();
    start(async () => setMsg(await updateMe({ display_name: displayName, level: lvl, animal: pick, drawing: pick === 'custom' ? fresh : null })));
  }

  // A fresh edit clears the old "Saved" message.
  useEffect(() => setMsg(null), [displayName, lvl, pick, fresh]);

  return (
    <form onSubmit={save} className="stack loose">
      <div className="row between">
        <div className="row">
          <Link href="/" className="avatar" style={{ background: '#fff', color: 'var(--ink)' }} aria-label="Back">
            <Icon name="back" />
          </Link>
          <h1 style={{ fontSize: 28 }}>Me</h1>
        </div>
        <button className="btn primary" disabled={pending}>
          {pending ? 'Saving…' : msg?.ok ? 'Saved ✓' : 'Save'}
        </button>
      </div>
      {msg?.error && <div className="notice bad" role="alert">{msg.error}</div>}
      <label className="field">
        Name the crew sees
        <input type="text" value={displayName} maxLength={40} required onChange={(e) => setDisplayName(e.target.value)} />
      </label>
      <fieldset className="stack" style={{ border: 'none', padding: 0, margin: 0 }}>
        <legend className="eyebrow" style={{ marginBottom: 10 }}>
          My spirit animal
        </legend>
        <div className="card row">
          <Avatar
            id={id}
            name={displayName || name}
            animal={pick === 'custom' ? null : pick}
            picture={pick === 'custom' && customSrc ? customSrc : undefined}
            size="lg"
          />
          <div className="grow">
            <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 19 }}>
              {pick === 'custom' ? customName : chosen ? chosen.name : 'Just initials'}
            </div>
            <div className="muted">
              {pick === 'custom'
                ? `Drawn by Claude: “${fresh?.prompt ?? drawn?.prompt ?? ''}”`
                : chosen
                  ? chosen.vibe
                  : 'Pick an animal below or describe your own. Your initials stay on it so the crew knows it’s you.'}
            </div>
          </div>
        </div>
        <p className="muted small">Mid-energy animals only. No lions, no bears. We’re here at 9am, not 5am.</p>
        <div className="card stack">
          <label className="field" style={{ margin: 0 }}>
            Describe your own and Claude draws it
            <input
              type="text"
              value={idea}
              maxLength={120}
              placeholder="a grumpy beaver with a coffee"
              onChange={(e) => setIdea(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (idea.trim() && !drawing) draw();
                }
              }}
            />
          </label>
          <button type="button" className="btn" disabled={drawing || !idea.trim()} onClick={draw}>
            {drawing ? 'Drawing… (about 20 seconds)' : fresh ? 'Draw it again' : 'Draw it'}
          </button>
          {drawNote?.ok && <p className="small" role="status">{drawNote.ok}</p>}
          {drawNote?.error && <p className="small" role="alert">{drawNote.error}</p>}
        </div>
        <div className="animal-grid" role="radiogroup" aria-label="Spirit animal">
          <button type="button" role="radio" aria-checked={pick === null} className={pick === null ? 'on' : ''} onClick={() => setPick(null)}>
            <span className="animal-none">AB</span>
            <span>None</span>
          </button>
          {customSrc && (
            <button type="button" role="radio" aria-checked={pick === 'custom'} className={pick === 'custom' ? 'on' : ''} onClick={() => setPick('custom')} title={customName}>
              <img src={customSrc} alt="" width={36} height={36} />
              <span>Yours</span>
            </button>
          )}
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
