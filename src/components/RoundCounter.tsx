'use client';
import { useEffect, useState } from 'react';
import type { Part } from '@/lib/types';

/** Parts where counting rounds helps: AMRAPs, "x rounds", stations, conditioning. */
export function countsRounds(part: Part) {
  const text = `${part.title} ${part.versions.join(' ')} ${part.outdoor?.versions.join(' ') ?? ''}`;
  return part.kind === 'conditioning' || /\b(amrap|rounds?|as many|stations?)\b/i.test(text);
}

/** How many rounds a part asks for ("4 rounds: …", "5 × 3 min", "EMOM 10"); null for AMRAPs and open-ended work. */
export function roundsTarget(text: string): number | null {
  if (/\b(amrap|as many)\b/i.test(text)) return null;
  const m = /\b(\d{1,2})\s*rounds?\b/i.exec(text) ?? /\b(?:emom|e\dmom)\s*(\d{1,2})\b/i.exec(text) ?? /^\s*(\d{1,2})\s*[×x]\s*\d/m.exec(text);
  const n = m ? Number(m[1]) : 0;
  return n >= 2 && n <= 30 ? n : null;
}

/** A line of cheer for how many rounds are left. */
function cheer(left: number, target: number) {
  if (left <= 0) return 'All done! 🎉';
  if (left === 1) return 'Last one. Empty the tank 🔥';
  if (left === target) return 'Let’s go 💪';
  if (target % 2 === 0 && left === target / 2) return 'Halfway there ⛰️';
  if (left === 2) return 'Two more. You’ve got this';
  return left < target / 2 ? 'Downhill from here 🚴' : 'Settle in, keep moving';
}

/**
 * A big tap counter for rounds during the workout. Remembered on this phone for the day.
 * With a set number of rounds it counts down: "3 to go", a dot per round, and a cheer.
 */
export function RoundCounter({ id, target = null }: { id: string; target?: number | null }) {
  const key = `rounds:${id}`;
  const [n, setN] = useState(0);
  useEffect(() => {
    try {
      setN(Number(localStorage.getItem(key)) || 0);
    } catch {}
  }, [key]);
  const set = (v: number) => {
    const next = Math.max(0, Math.min(999, v));
    setN(next);
    try {
      localStorage.setItem(key, String(next));
    } catch {}
  };
  const finished = Boolean(target && n >= target);
  return (
    <div className="round-wrap" role="group" aria-label="Round counter">
      <div className="round-counter">
        {target ? (
          <div className={`round-count${finished ? ' done' : ''}`} aria-live="polite">
            <span>{finished ? '✓' : target - n}</span>
            <small>{finished ? `${target} of ${target}` : 'to go'}</small>
          </div>
        ) : (
          <div className="round-count" aria-live="polite">
            <span>{n}</span>
            <small>{n === 1 ? 'round' : 'rounds'}</small>
          </div>
        )}
        <button
          type="button"
          className="round-done"
          disabled={finished}
          onClick={() => {
            set(n + 1);
            try {
              navigator.vibrate?.(30);
            } catch {}
          }}
        >
          <span aria-hidden="true">✓</span> {finished ? 'All done' : 'Round done'}
        </button>
      </div>
      {target && (
        <div className="round-dots" aria-hidden="true">
          {Array.from({ length: target }, (_, i) => (
            <span key={i} className={i < n ? 'on' : ''} />
          ))}
        </div>
      )}
      {target && <p className="round-cheer">{cheer(target - n, target)}</p>}
      {n > 0 && (
        <button type="button" className="round-undo" onClick={() => set(n - 1)}>
          Undo last round
        </button>
      )}
    </div>
  );
}
