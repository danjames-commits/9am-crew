'use client';
import { useState, useTransition } from 'react';
import { setAttendance } from '@/app/actions';

/** "I'm in" for a day further out, right from the week list. Flips straight away. */
export function RsvpChip({ date, going, others }: { date: string; going: boolean; others: number }) {
  const [on, setOn] = useState(going);
  const [failed, setFailed] = useState(false);
  const [, start] = useTransition();
  const count = others + (on ? 1 : 0);

  return (
    <span className="rsvp">
      <button
        type="button"
        className={`rsvp-chip ${on ? 'on' : ''}`}
        aria-pressed={on}
        aria-label={on ? 'You’re in. Tap if you can’t make it.' : 'I’m in'}
        onClick={(e) => {
          // The row is a link to the workout: tapping this just signs you up.
          e.preventDefault();
          e.stopPropagation();
          const next = !on;
          setOn(next);
          setFailed(false);
          start(async () => {
            const r = await setAttendance(date, next);
            if (r && 'error' in r && r.error) {
              setOn(!next);
              setFailed(true);
            }
          });
        }}
      >
        {on ? '✓ In' : 'I’m in'}
      </button>
      <span className="muted small">{failed ? 'Try again' : count ? `${count} going` : ' '}</span>
    </span>
  );
}
