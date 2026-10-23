'use client';
import { useEffect, useState } from 'react';
import type { Part } from '@/lib/types';

/** Parts where counting rounds helps: AMRAPs, "x rounds", stations, conditioning. */
export function countsRounds(part: Part) {
  const text = `${part.title} ${part.versions.join(' ')} ${part.outdoor?.versions.join(' ') ?? ''}`;
  return part.kind === 'conditioning' || /\b(amrap|rounds?|as many|stations?)\b/i.test(text);
}

/** A big tap counter for rounds during the workout. Remembered on this phone for the day. */
export function RoundCounter({ id }: { id: string }) {
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
  return (
    <div className="round-counter" role="group" aria-label="Round counter">
      <button type="button" className="round-btn minus" aria-label="One round less" onClick={() => set(n - 1)} disabled={n === 0}>
        −
      </button>
      <div className="round-count" aria-live="polite">
        <span>{n}</span>
        <small>{n === 1 ? 'round' : 'rounds'}</small>
      </div>
      <button
        type="button"
        className="round-btn plus"
        aria-label="One more round"
        onClick={() => {
          set(n + 1);
          try {
            navigator.vibrate?.(30);
          } catch {}
        }}
      >
        +
      </button>
    </div>
  );
}
