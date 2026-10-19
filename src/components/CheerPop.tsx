'use client';
import { useState } from 'react';

const BURST = ['👏', '🔥', '💪', '🎉', '👏', '⭐'];

/** A round 👏 button with a count. Cheering pops, buzzes and sends a little burst of emoji up. */
export function CheerPop({
  count,
  cheered,
  disabled,
  name,
  onToggle,
}: {
  count: number;
  cheered: boolean;
  disabled?: boolean;
  name: string;
  onToggle: () => void;
}) {
  const [bursts, setBursts] = useState<number[]>([]);

  function tap() {
    if (!cheered) {
      const id = Date.now();
      setBursts((b) => [...b, id]);
      setTimeout(() => setBursts((b) => b.filter((x) => x !== id)), 1100);
      try {
        navigator.vibrate?.(12);
      } catch {}
    }
    onToggle();
  }

  if (disabled) {
    // Your own best: no button, just the count.
    return (
      <div className="cheer-count" aria-label={`${count} ${count === 1 ? 'cheer' : 'cheers'}`}>
        <span aria-hidden="true">👏</span> {count}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={`cheer-pop ${cheered ? 'on' : ''}`}
      onClick={tap}
      aria-pressed={cheered}
      aria-label={cheered ? `You cheered for ${name}. Tap to undo.` : `Cheer for ${name}`}
    >
      <span className="cheer-hands" aria-hidden="true" key={cheered ? 'on' : 'off'}>
        👏
      </span>
      <span className="cheer-n">{count}</span>
      {bursts.map((id) => (
        <span key={id} className="cheer-burst" aria-hidden="true">
          {BURST.map((e, i) => (
            <span key={i} style={{ ['--i' as string]: i }}>
              {e}
            </span>
          ))}
        </span>
      ))}
    </button>
  );
}
