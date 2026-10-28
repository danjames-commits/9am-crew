'use client';
import { useState, useTransition } from 'react';
import { saveSurvey } from '@/app/actions';

const HARD = ['Too easy', 'Just right', 'Too hard'];
const LENGTH = ['Too short', 'About right', 'Too long'];

/** A quick two-question survey after a class you signed up for. Shows once; Skip counts. */
export function SurveyPopup({ classDate, when, title }: { classDate: string; when: string; title: string }) {
  const [open, setOpen] = useState(true);
  const [hard, setHard] = useState<number | null>(null);
  const [length, setLength] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [thanks, setThanks] = useState(false);
  const [saving, start] = useTransition();
  if (!open) return null;

  const send = (answer: Parameters<typeof saveSurvey>[1]) =>
    start(async () => {
      setError('');
      const r = await saveSurvey(classDate, answer);
      if (r && 'error' in r && r.error) return setError(r.error);
      if (answer === 'skip') return setOpen(false);
      setThanks(true);
      setTimeout(() => setOpen(false), 1200);
    });

  return (
    <div className="survey-sheet" role="dialog" aria-modal="true" aria-labelledby="survey-title">
      <div className="survey-card stack">
        {thanks ? (
          <p className="survey-thanks">Thanks! 🙌</p>
        ) : (
          <>
            <div>
              <div className="eyebrow">{when} · quick check-in</div>
              <h2 id="survey-title" style={{ fontSize: 22 }}>
                How was {title}?
              </h2>
            </div>
            <Choice label="How hard was it?" options={HARD} value={hard} onPick={setHard} />
            <Choice label="How was the length?" options={LENGTH} value={length} onPick={setLength} />
            {error && (
              <p className="small" role="alert">
                {error}
              </p>
            )}
            <div className="row" style={{ gap: 8 }}>
              <button type="button" className="btn primary grow" disabled={saving || hard == null || length == null} onClick={() => send({ hard: hard!, length: length! })}>
                {saving ? 'Sending…' : 'Send'}
              </button>
              <button type="button" className="btn ghost" disabled={saving} onClick={() => send('skip')}>
                Skip
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Choice({ label, options, value, onPick }: { label: string; options: string[]; value: number | null; onPick: (n: number) => void }) {
  return (
    <div className="stack tight">
      <div className="field-label">{label}</div>
      <div className="segmented" role="group" aria-label={label} style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
        {options.map((o, i) => (
          <button key={o} type="button" aria-pressed={value === i + 1} onClick={() => onPick(i + 1)}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}
