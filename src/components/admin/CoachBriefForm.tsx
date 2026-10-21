'use client';
import { useState, useTransition } from 'react';
import { saveCoachBrief } from '@/app/actions';

const MAX = 6000;

export function CoachBriefForm({ initial, starting, edited }: { initial: string; starting: string; edited: string }) {
  const [text, setText] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [msg, setMsg] = useState<{ ok?: string; error?: string } | null>(null);
  const [pending, start] = useTransition();
  const dirty = text.trim() !== saved.trim();

  function save() {
    setMsg(null);
    start(async () => {
      const r = await saveCoachBrief(text);
      if (r && 'error' in r && r.error) setMsg({ error: r.error });
      else {
        const next = text.trim() || starting;
        setText(next);
        setSaved(next);
        setMsg({ ok: r && 'reset' in r && r.reset ? 'Saved. Using the starting version.' : 'Saved. Claude uses this from now on.' });
      }
    });
  }

  return (
    <div className="stack">
      <label className="field">
        <span className="row between">
          <span>The brief</span>
          <span className="muted small">
            {text.length.toLocaleString()} / {MAX.toLocaleString()}
          </span>
        </span>
        <textarea className="brief-text" value={text} maxLength={MAX} rows={22} onChange={(e) => setText(e.target.value)} spellCheck />
      </label>
      <p className="muted small">{edited}</p>
      <div className="row" style={{ gap: 8 }}>
        <button type="button" className="btn primary grow" disabled={pending || !dirty} onClick={save}>
          {pending ? 'Saving…' : dirty ? 'Save' : 'Saved'}
        </button>
        <button
          type="button"
          className="btn ghost"
          disabled={pending || text.trim() === starting.trim()}
          onClick={() => {
            setText(starting);
            setMsg({ ok: 'Starting version loaded. Press Save to use it.' });
          }}
        >
          Starting version
        </button>
      </div>
      {msg?.ok && (
        <p className="small" role="status">
          {msg.ok}
        </p>
      )}
      {msg?.error && (
        <p className="small" role="alert">
          {msg.error}
        </p>
      )}
    </div>
  );
}
