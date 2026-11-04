'use client';
import { useEffect, useState } from 'react';
import type { Part } from '@/lib/types';
import { parseRound, type RoundItem } from '@/lib/round-parse';

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
export function RoundCounter({ id, target = null, text = '' }: { id: string; target?: number | null; text?: string }) {
  const items = target ? [] : parseRound(text);
  if (items.length) return <StationCounter id={id} items={items} blocks={blockCount(text)} />;
  return <SimpleCounter id={id} target={target} />;
}

function SimpleCounter({ id, target }: { id: string; target: number | null }) {
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
          <span aria-hidden="true">✓</span> {finished ? 'All rounds done' : `Round ${n + 1} done`}
          {target && !finished && <small>of {target}</small>}
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

/** "3 × 7 min, as many rounds as you can": three blocks, each scored on its own. */
export function blockCount(text: string): number {
  if (!/\b(amrap|as many)\b/i.test(text)) return 1;
  const m = /\b(\d)\s*[×x]\s*\d{1,2}\s*min/i.exec(text);
  const n = m ? Number(m[1]) : 1;
  return n >= 2 && n <= 6 ? n : 1;
}

interface Block {
  n: number;
  partial: number[];
}

const repsOf = (items: RoundItem[], partial: number[]) => items.reduce((s, it, i) => s + (it.unit === 'reps' ? partial[i] ?? 0 : 0), 0);
const scoreText = (items: RoundItem[], b: Block) => {
  const extra = items.some((_, i) => b.partial[i]);
  if (!extra) return `${b.n} ${b.n === 1 ? 'round' : 'rounds'}`;
  const reps = repsOf(items, b.partial);
  const other = items
    .map((it, i) => (it.unit !== 'reps' && b.partial[i] ? `${b.partial[i]} ${it.unit} ${it.name.toLowerCase()}` : ''))
    .filter(Boolean);
  return [`${b.n} + ${reps} reps`, ...other].join(', ');
};

/**
 * Station AMRAPs: count whole rounds with the big button, and when time's up, tap in how far
 * you got into the last one. Several blocks ("3 × 7 min") each keep their own score.
 * Remembered on this phone for the day; the total rounds feed the log below, like before.
 */
export function StationCounter({ id, items, blocks }: { id: string; items: RoundItem[]; blocks: number }) {
  const key = `rounds:${id}:stations`;
  const empty = (): Block[] => Array.from({ length: blocks }, () => ({ n: 0, partial: items.map(() => 0) }));
  const [all, setAll] = useState<Block[]>(empty);
  const [cur, setCur] = useState(0);
  const [showPartial, setShowPartial] = useState(false);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) ?? 'null');
      if (saved?.all?.length === blocks) {
        setAll(saved.all);
        setCur(Math.min(blocks - 1, saved.cur ?? 0));
      } else {
        // Carry over a count from the simple counter.
        const n = Number(localStorage.getItem(`rounds:${id}`)) || 0;
        if (n) setAll((a) => a.map((b, i) => (i === 0 ? { ...b, n } : b)));
      }
    } catch {}
  }, [key, id, blocks]);

  const save = (next: Block[], c = cur) => {
    setAll(next);
    try {
      localStorage.setItem(key, JSON.stringify({ all: next, cur: c }));
      localStorage.setItem(`rounds:${id}`, String(next.reduce((s, b) => s + b.n, 0)));
    } catch {}
  };
  const b = all[cur] ?? empty()[0];
  const setBlock = (nb: Block) => save(all.map((x, i) => (i === cur ? nb : x)));
  const step = (i: number, d: number) => setBlock({ ...b, partial: b.partial.map((x, j) => (j === i ? Math.max(0, Math.min(items[i].count, x + d)) : x)) });
  const hasPartial = items.some((_, i) => b.partial[i]);

  return (
    <div className="round-wrap" role="group" aria-label="Round counter">
      {blocks > 1 && (
        <div className="segmented" role="group" aria-label="Which block" style={{ gridTemplateColumns: `repeat(${blocks}, minmax(0, 1fr))` }}>
          {all.map((x, i) => (
            <button
              key={i}
              type="button"
              aria-pressed={i === cur}
              onClick={() => {
                setCur(i);
                setShowPartial(false);
                save(all, i);
              }}
            >
              Block {i + 1}
              <span className="block-score">{x.n || items.some((_, j) => x.partial[j]) ? scoreText(items, x) : '–'}</span>
            </button>
          ))}
        </div>
      )}
      <div className="round-counter">
        <div className="round-count" aria-live="polite">
          <span>{b.n}</span>
          <small>{b.n === 1 ? 'round' : 'rounds'}</small>
        </div>
        <button
          type="button"
          className="round-done"
          onClick={() => {
            setBlock({ ...b, n: b.n + 1, partial: items.map(() => 0) });
            try {
              navigator.vibrate?.(30);
            } catch {}
          }}
        >
          <span aria-hidden="true">✓</span> Round {b.n + 1} done
        </button>
      </div>

      {showPartial || hasPartial ? (
        <div className="stack tight">
          <div className="field-label">Time’s up: how far into round {b.n + 1}?</div>
          <div className="partial-list">
            {items.map((it, i) => (
              <div key={i} className="partial-row">
                <span className="grow">
                  {it.name}{' '}
                  <span className="muted small">
                    / {it.count}
                    {it.unit === 'reps' ? '' : ` ${it.unit}`}
                  </span>
                </span>
                <button type="button" className="partial-step" aria-label={`Fewer ${it.name}`} onClick={() => step(i, it.unit === 'm' ? -25 : -1)} disabled={!b.partial[i]}>
                  −
                </button>
                <span className="partial-n">{b.partial[i]}</span>
                <button type="button" className="partial-step" aria-label={`More ${it.name}`} onClick={() => step(i, it.unit === 'm' ? 25 : 1)} disabled={b.partial[i] >= it.count}>
                  +
                </button>
                <button type="button" className={`partial-all ${b.partial[i] === it.count ? 'on' : ''}`} onClick={() => step(i, b.partial[i] === it.count ? -it.count : it.count)}>
                  All
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <button type="button" className="btn ghost" onClick={() => setShowPartial(true)}>
          Time’s up: add a partial round
        </button>
      )}

      <p className="round-cheer">
        {blocks > 1 ? `Block ${cur + 1}: ` : ''}
        {scoreText(items, b)}
        {blocks > 1 && all.some((x) => x.n) ? ` · total ${all.reduce((s, x) => s + x.n, 0)} rounds + ${all.reduce((s, x) => s + repsOf(items, x.partial), 0)} reps` : ''}
      </p>
      {(b.n > 0 || hasPartial) && (
        <button
          type="button"
          className="round-undo"
          onClick={() => (hasPartial ? setBlock({ ...b, partial: items.map(() => 0) }) : setBlock({ ...b, n: b.n - 1 }))}
        >
          {hasPartial ? 'Clear the partial round' : 'Undo last round'}
        </button>
      )}
    </div>
  );
}
