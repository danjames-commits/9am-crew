'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setWeeklyGoal } from '@/app/actions';

/** Pick your own weekly goal, 1 to 5 classes. */
export function GoalPicker({ goal }: { goal: number }) {
  const [value, setValue] = useState(goal);
  const [error, setError] = useState('');
  const [saving, start] = useTransition();
  const router = useRouter();

  function pick(n: number) {
    const before = value;
    setValue(n);
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
    <div className="stack tight">
      <div className="row between">
        <b>My weekly goal</b>
        <span className="muted small">{saving ? 'Saving…' : `${value} ${value === 1 ? 'class' : 'classes'} a week`}</span>
      </div>
      <div className="segmented" role="group" aria-label="Classes a week" style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" aria-pressed={value === n} onClick={() => pick(n)}>
            {n}
          </button>
        ))}
      </div>
      <p className="muted small">Pick what you can keep up. Everyone ranks on weeks they hit their own goal.</p>
      {error && (
        <p className="small" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
