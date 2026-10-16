import Link from 'next/link';
import type { Part } from '@/lib/types';
import { aimRange, setPlan, weightFor } from '@/lib/programming/engine';

/** Turns "5×5 @ 76%" into this person's own warm-ups and work sets. */
export function YourNumbers({ part, level, maxes, bar = 45 }: { part: Part; level: number; maxes: Record<string, number>; bar?: number }) {
  const lift = part.lift;
  if (!lift) return null;
  const i = level - 1;
  const text = part.versions[i] ?? '';
  const movement = i === 0 && lift.gentleMovement ? lift.gentleMovement : lift.movement;
  const est = maxes[movement];
  const pct = lift.pct[i];

  // Sets and reps: from the plan, or read from the text ("5×5", "4 × 10", "set of 5").
  const scheme = text.match(/(\d+)\s*[×x]\s*(\d+)/);
  const sets = lift.sets ?? (scheme ? Number(scheme[1]) : 1);
  const reps = (i === 0 && scheme ? Number(scheme[2]) : undefined) ?? lift.reps ?? (scheme ? Number(scheme[2]) : Number(text.match(/set of (\d+)/)?.[1] ?? 5));

  const box: React.CSSProperties = { background: 'var(--teal-soft)', color: 'var(--teal-ink)', borderRadius: 12, padding: '10px 12px' };

  // Gentle does an easier movement nobody logs weights for.
  if (i === 0 && lift.gentleMovement && lift.gentleMovement !== lift.movement) {
    return (
      <div className="small" style={box}>
        Pick a {lift.gentleMovement.toLowerCase()} weight you could lift about 12 times with good form. If the last set feels easy, go up next time.
      </div>
    );
  }

  if (!est) {
    return (
      <div className="small" style={box}>
        {pct != null ? (
          <>
            Log a recent {movement.toLowerCase()} on <Link href="/lifts">My lifts</Link> and your sets will show here in pounds.
          </>
        ) : (
          <>Start light and build up. Afterwards, log your top set on <Link href="/lifts">My lifts</Link> so future workouts use your numbers.</>
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
  const lines = setPlan(work, i === 0 ? sets : lift.sets ?? sets, reps, i === 0 ? 0 : bar);
  return (
    <div className="small" style={box}>
      <b>Your numbers</b> <span style={{ opacity: 0.8 }}>({pct}% of your {movement.toLowerCase()})</span>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 6 }}>
        <tbody>
          {lines.map((l, k) => (
            <tr key={k} style={{ borderTop: k ? '1px solid rgba(23,66,61,0.15)' : 'none', fontWeight: l.label === 'Work' ? 800 : 500 }}>
              <td style={{ padding: '6px 0' }}>{l.label}</td>
              <td style={{ padding: '6px 0', textAlign: 'right' }}>
                {l.sets > 1 ? `${l.sets} × ` : ''}
                {l.reps} @ {l.weight == null ? (i === 0 ? 'light' : 'empty bar') : `${l.weight} lb`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
