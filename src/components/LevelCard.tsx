'use client';
import { useState, useTransition } from 'react';
import { setLevel } from '@/app/actions';
import { LEVELS, levelName } from '@/lib/types';

/** "My level" card that opens in place to switch level, saving as soon as you tap one. */
export function LevelCard({ level }: { level: number }) {
  const [current, setCurrent] = useState(level);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [pending, start] = useTransition();

  function pick(n: number) {
    if (n === current) return setOpen(false);
    const before = current;
    setCurrent(n);
    setOpen(false);
    setError('');
    start(async () => {
      const r = await setLevel(n);
      if (r?.error) {
        setCurrent(before);
        setError(r.error);
      }
    });
  }

  return (
    <div className="card stack">
      <div className="row">
        <div className="grow">
          <div className="eyebrow">My level</div>
          <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 22 }}>
            {levelName(current)}{' '}
            <span className="muted" style={{ fontFamily: 'var(--body)', fontWeight: 500 }}>
              · {current} of 4{pending ? ' · saving…' : ''}
            </span>
          </div>
        </div>
        <button type="button" className="btn outline small" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? 'Done' : 'Change'}
        </button>
      </div>
      {open && (
        <div className="stack" role="radiogroup" aria-label="My level">
          {LEVELS.map((l) => (
            <button
              key={l.n}
              type="button"
              role="radio"
              aria-checked={current === l.n}
              onClick={() => pick(l.n)}
              className="level-option"
              style={{ borderColor: current === l.n ? 'var(--ink)' : 'transparent' }}
            >
              <span style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 18, display: 'block' }}>
                {l.n}. {l.name}
              </span>
              <span className="muted small">{l.blurb}</span>
            </button>
          ))}
          <p className="muted small" style={{ margin: 0 }}>Picks which version of each workout opens first. You can still look at any level.</p>
        </div>
      )}
      {error && <p className="small" role="alert" style={{ margin: 0 }}>{error}</p>}
    </div>
  );
}
