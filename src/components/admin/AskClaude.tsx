'use client';
import { useState, useTransition } from 'react';
import { aiDraft } from '@/app/actions';
import type { WorkoutDraft } from '@/lib/types';

const IDEAS = ['Shoulder-friendly', 'Only 3 rowers today', 'Make it shorter', 'More variety in the conditioning'];

/** Lets an admin ask Claude to write or rework the workout on screen. */
export function AskClaude({ date, current, onDraft }: { date: string; current: WorkoutDraft; onDraft: (d: WorkoutDraft) => void }) {
  const [text, setText] = useState('');
  const [pending, run] = useTransition();
  const [msg, setMsg] = useState<{ ok?: string; error?: string } | null>(null);

  function ask(request: string) {
    setMsg(null);
    run(async () => {
      const r = await aiDraft(date, request, current);
      if (r.error) setMsg({ error: r.error });
      else if (r.draft) {
        onDraft(r.draft);
        setMsg({ ok: 'Claude drafted this. Check it over, then save or publish.' });
        setText('');
      }
    });
  }

  return (
    <section className="card stack" style={{ border: '2px solid var(--teal)' }} aria-labelledby="ask-claude">
      <h2 id="ask-claude" style={{ fontSize: 18 }}>
        Ask Claude
      </h2>
      <p className="muted small">Describe what you want, or leave it blank for a fresh workout that fits the plan. Nothing changes for the crew until you publish.</p>
      <label className="sr-only" htmlFor="ask-text">
        What should Claude do?
      </label>
      <textarea
        id="ask-text"
        rows={2}
        maxLength={500}
        placeholder="e.g. knee-friendly today, and swap the rower for the bike"
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={pending}
      />
      <div className="row wrap" style={{ gap: 6 }}>
        {IDEAS.map((i) => (
          <button key={i} type="button" className="btn small ghost" disabled={pending} onClick={() => setText(i)}>
            {i}
          </button>
        ))}
      </div>
      <button type="button" className="btn teal" disabled={pending} onClick={() => ask(text)}>
        {pending ? 'Claude is writing… about 20 seconds' : text.trim() ? 'Ask Claude' : 'Write a fresh workout'}
      </button>
      {msg?.error && <div className="notice bad" role="alert">{msg.error}</div>}
      {msg?.ok && <div className="notice good" role="status">{msg.ok}</div>}
    </section>
  );
}
