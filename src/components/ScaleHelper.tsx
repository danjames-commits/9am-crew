'use client';
import { useState, useTransition } from 'react';
import { aiScale } from '@/app/actions';

const QUICK = ['My knee is sore', 'My shoulder is sore', 'Low energy today', 'Missing some equipment'];

/** "Need to adjust today?" — Claude suggests swaps for this person's version of the workout. */
export function ScaleHelper({ classDate, outside }: { classDate: string; outside: boolean }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [advice, setAdvice] = useState('');
  const [error, setError] = useState('');
  const [pending, run] = useTransition();

  function ask() {
    setError('');
    setAdvice('');
    run(async () => {
      const r = await aiScale(classDate, text, outside);
      if (r.error) setError(r.error);
      else if (r.advice) setAdvice(r.advice);
    });
  }

  if (!open) {
    return (
      <button type="button" className="btn ghost" onClick={() => setOpen(true)}>
        Need to adjust today? Ask Claude
      </button>
    );
  }

  return (
    <section className="card stack" style={{ border: '2px solid var(--teal)' }} aria-labelledby="scale-title">
      <div className="row between">
        <h2 id="scale-title" style={{ fontSize: 18 }}>
          Adjust today’s workout
        </h2>
        <button type="button" className="btn small ghost" onClick={() => setOpen(false)}>
          Close
        </button>
      </div>
      <label className="sr-only" htmlFor="scale-text">
        What’s going on?
      </label>
      <textarea
        id="scale-text"
        rows={2}
        maxLength={500}
        placeholder="e.g. my lower back is tight, or there’s no 35 lb kettlebell left"
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={pending}
      />
      <div className="row wrap" style={{ gap: 6 }}>
        {QUICK.map((q) => (
          <button key={q} type="button" className="btn small ghost" disabled={pending} onClick={() => setText(q)}>
            {q}
          </button>
        ))}
      </div>
      <button type="button" className="btn teal" disabled={pending || !text.trim()} onClick={ask}>
        {pending ? 'Claude is thinking…' : 'Get suggestions'}
      </button>
      {error && <div className="notice bad" role="alert">{error}</div>}
      {advice && (
        <div className="notice good pre" role="status">
          {advice}
        </div>
      )}
      <p className="muted small">Suggestions from Claude for your level today. Not medical advice: if something really hurts, skip it and check with a professional.</p>
    </section>
  );
}
