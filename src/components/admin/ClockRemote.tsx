'use client';
import { useState, useTransition } from 'react';
import { pressClock } from '@/app/actions';

const LABEL: Record<string, string> = { Star: '*', Hash: '#', Up: '↑', Down: '↓', Left: '←', Right: '→' };
const PRESETS: Record<string, string> = { F1: '100 min up', F2: '20 min down', F3: 'FGB', F4: 'Stopwatch', F5: 'Tabata' };

/** The clock remote, on screen. Each press goes through SwitchBot to the clock. */
export function ClockRemote({ rows, ready }: { rows: string[][]; ready: boolean }) {
  const [last, setLast] = useState<{ button: string; ok: boolean; note?: string } | null>(null);
  const [busy, start] = useTransition();

  function press(button: string) {
    start(async () => {
      const r = await pressClock(button);
      setLast(r && 'error' in r && r.error ? { button, ok: false, note: r.error } : { button, ok: true });
    });
  }

  return (
    <div className="card clock-remote">
      {rows.map((row, i) => (
        <div key={i} className="clock-row" style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }}>
          {row.map((b) => (
            <button
              key={b}
              type="button"
              className={`clock-btn ${b === 'Power' ? 'power' : ''} ${b === 'Set' || b === 'OK' ? 'blue' : ''}`}
              disabled={!ready || busy}
              onClick={() => press(b)}
            >
              {LABEL[b] ?? b}
              {PRESETS[b] && <small>{PRESETS[b]}</small>}
            </button>
          ))}
        </div>
      ))}
      <p className="small" role="status" style={{ minHeight: 20, margin: 0 }}>
        {!ready ? 'Buttons work once the clock remote is set up in SwitchBot.' : busy ? 'Sending…' : last ? (last.ok ? `Sent ${last.button} ✓` : last.note) : ''}
      </p>
    </div>
  );
}
