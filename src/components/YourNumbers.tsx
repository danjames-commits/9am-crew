import Link from 'next/link';
import type { Part } from '@/lib/types';
import { aimRange, setPlan, weightFor } from '@/lib/programming/engine';
import { PlateTable } from './PlateTable';

/** Turns "5×5 @ 76%" into this person's own warm-ups and work sets. */
export function YourNumbers({ part, level, maxes, bar = 45, setsId }: { part: Part; level: number; maxes: Record<string, number>; bar?: number; setsId?: string }) {
  const lift = part.lift;
  if (!lift) return null;
  const i = level - 1;
  const text = part.versions[i] ?? '';
  const movement = lift.movement;
  const est = maxes[movement];
  const pct = lift.pct[i];

  // Sets and reps: from the plan, or read from the text ("5×5", "4 × 10", "set of 5").
  const scheme = text.match(/(\d+)\s*[×x]\s*(\d+)/);
  const sets = lift.sets ?? (scheme ? Number(scheme[1]) : 1);
  const reps = lift.reps ?? (scheme ? Number(scheme[2]) : Number(text.match(/set of (\d+)/)?.[1] ?? 5));

  const box: React.CSSProperties = { background: 'var(--teal-soft)', color: 'var(--teal-ink)', borderRadius: 12, padding: '10px 12px' };

  if (!est) {
    return (
      <div className="small" style={box}>
        {pct != null ? (
          <>
            Log a recent {movement.toLowerCase()} on <Link href="/lifts">My stats</Link> and your sets will show here in pounds.
          </>
        ) : (
          <>Start light and build up. Afterwards, log your top set on <Link href="/lifts">My stats</Link> so future workouts use your numbers.</>
        )}
      </div>
    );
  }

  if (pct == null) {
    const { low, high } = aimRange(est, reps);
    return (
      <div className="small" style={box}>
        <b>Your numbers</b>
        <br />
        Based on your {movement.toLowerCase()} so far, aim for about <b>{low}–{high} lb</b> for a solid set of {reps}. If it moves well, go up; if not, stay there.
      </div>
    );
  }

  const work = weightFor(est, pct)!;
  const lines = setPlan(work, lift.sets ?? sets, reps, bar);
  return (
    <div className="small" style={box}>
      <b>Your numbers</b> <span style={{ opacity: 0.8 }}>({pct}% of your {movement.toLowerCase()})</span>
      <PlateTable lines={lines} setsId={setsId} />
    </div>
  );
}
