'use client';
import { useActionState, useEffect, useRef, useState } from 'react';
import { logLift } from '@/app/actions';

type Result = { error?: string; ok?: boolean; isPr?: boolean; at?: number } | null;

export function LogLiftForm({ movements, today, initialMovement }: { movements: { id: number; name: string }[]; today: string; initialMovement?: number }) {
  const [state, action, pending] = useActionState<Result, FormData>(logLift as (s: Result, f: FormData) => Promise<Result>, null);
  const [open, setOpen] = useState(Boolean(initialMovement));
  const [unknownDate, setUnknownDate] = useState(false);
  const weightRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state?.ok && weightRef.current) weightRef.current.value = '';
  }, [state]);

  if (!open) {
    return (
      <button className="btn primary big" onClick={() => setOpen(true)}>
        + Log a lift
      </button>
    );
  }

  return (
    <form action={action} className="card stack loose">
      <h2>Log a lift</h2>
      <label className="field">
        Movement
        <select name="movement_id" defaultValue={initialMovement ?? movements[0]?.id} required>
          {movements.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>
      <div className="row fields">
        <label className="field grow">
          Weight (lb)
          <input ref={weightRef} name="weight" type="number" inputMode="decimal" step="0.5" min="1" max="1999" required />
        </label>
        <label className="field" style={{ width: 110 }}>
          Reps
          <input name="reps" type="number" inputMode="numeric" min="1" max="20" defaultValue={1} required />
        </label>
      </div>
      <label className="field">
        Date
        <input name="logged_on" type="date" defaultValue={today} max={today} required={!unknownDate} disabled={unknownDate} />
      </label>
      <label className="row" style={{ gap: 10, cursor: 'pointer', marginTop: -6 }}>
        <input
          type="checkbox"
          name="unknown_date"
          checked={unknownDate}
          onChange={(e) => setUnknownDate(e.target.checked)}
          style={{ width: 22, height: 22, minHeight: 0, accentColor: 'var(--ink)' }}
        />
        <span>
          I don’t remember when
          <span className="muted small" style={{ display: 'block' }}>Counts toward your numbers, but isn’t posted as a new best.</span>
        </span>
      </label>
      <div className="row">
        <button className="btn primary big grow" disabled={pending}>
          {pending ? 'Saving…' : 'Save'}
        </button>
        <button type="button" className="btn ghost big" onClick={() => setOpen(false)}>
          Close
        </button>
      </div>
      {state?.error && <div className="notice bad" role="alert">{state.error}</div>}
      {state?.ok && state.isPr && (
        <div className="notice party" role="status">
          New personal best! The crew has been told.
        </div>
      )}
      {state?.ok && !state.isPr && <div className="notice good" role="status">Saved.</div>}
    </form>
  );
}
