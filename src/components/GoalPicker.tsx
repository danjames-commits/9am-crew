'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setWeeklyGoal } from '@/app/actions';

/** Your weekly goal as one quiet line; tap Change to pick 1 to 5 classes a week. */
export function GoalPicker({ goal }: { goal: number | null }) {
  const [value, setValue] = useState<number | null>(goal);
  // No goal yet: show the choices straight away.
  const [open, setOpen] = useState(goal == null);
  const [error, setError] = useState('');
  const [saving, start] = useTransition();
  const router = useRouter();

  function pick(n: number) {
    const before = value;
    setValue(n);
    setOpen(false);
    setError('');
    start(async () => {
      const r = await setWeeklyGoal(n);
      if (r && 'error' in r) {
        setValue(before);
        setError(r.error ?? 'Couldn’t save that.');
      } else router.refresh();
    });
  }

  return (
    <div className="goal-line">
      <div className="row between">
        <span className="small">
          {value == null ? (
            <b>Set your weekly goal</b>
          ) : (
            <>
              Goal: <b>{value} {value === 1 ? 'class' : 'classes'} a week</b>
            </>
          )}
          {saving && <span className="muted"> · saving…</span>}
        </span>
        {value != null && (
          <button type="button" className="link-btn small" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? 'Done' : 'Change'}
          </button>
        )}
      </div>
      {open && (
        <div className="stack tight" style={{ marginTop: 10 }}>
          <div className="segmented goal-seg" role="group" aria-label="Classes a week" style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" aria-pressed={value === n} onClick={() => pick(n)}>
                {n}
              </button>
            ))}
          </div>
          <p className="muted small">Pick what you can keep up. Everyone ranks on weeks they hit their own goal.</p>
        </div>
      )}
      {error && (
        <p className="small" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
