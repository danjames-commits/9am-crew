'use client';
import { useState } from 'react';
import type { LiftSpec } from '@/lib/types';
import { GENTLE_FOR, gentleChoices, liftPct } from '@/lib/programming/engine';

/** The settings behind a lifting part. The words members see are written from these. */
export function LiftEditor({ spec, movements, onChange }: { spec: LiftSpec; movements: string[]; onChange: (s: LiftSpec) => void }) {
  const strong = spec.pct[2] ?? 75;
  const linked = spec.pct[1] === liftPct(strong)[1] && spec.pct[3] === liftPct(strong)[3];
  const [custom, setCustom] = useState(!linked && spec.pct[2] != null);
  const mode = spec.mode ?? (spec.pct[2] == null ? 'build' : 'percent');
  const num = (v: string, lo: number, hi: number, fallback: number) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) && n >= lo && n <= hi ? n : fallback;
  };
  const options = movements.includes(spec.movement) ? movements : [spec.movement, ...movements];
  const gentleOptions = gentleChoices(spec.gentleMovement && !gentleChoices(options).includes(spec.gentleMovement) ? [spec.gentleMovement, ...options] : options);

  return (
    <div className="stack">
      <label className="field">
        Lift
        <select
          value={spec.movement}
          onChange={(e) => onChange({ ...spec, movement: e.target.value, gentleMovement: GENTLE_FOR[e.target.value] ?? spec.gentleMovement ?? e.target.value })}
        >
          {options.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </label>

      <div className="segmented" role="group" aria-label="Type of lifting" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
        <button type="button" aria-pressed={mode === 'percent'} onClick={() => onChange({ ...spec, mode: 'percent', sets: spec.sets ?? 5, pct: spec.pct[2] != null ? spec.pct : liftPct(75) })}>
          Sets at a % of best
        </button>
        <button type="button" aria-pressed={mode === 'build'} onClick={() => onChange({ ...spec, mode: 'build', pct: [null, null, null, null] })}>
          Build to a solid set
        </button>
      </div>

      <div className="row fields">
        {mode === 'percent' && (
          <label className="field grow">
            Sets
            <input type="number" min={1} max={12} value={spec.sets ?? 5} onChange={(e) => onChange({ ...spec, sets: num(e.target.value, 1, 12, spec.sets ?? 5) })} />
          </label>
        )}
        <label className="field grow">
          Reps
          <input type="number" min={1} max={20} value={spec.reps ?? 5} onChange={(e) => onChange({ ...spec, reps: num(e.target.value, 1, 20, spec.reps ?? 5) })} />
        </label>
        {mode === 'percent' && (
          <label className="field grow">
            Strong %
            <input
              type="number"
              min={40}
              max={95}
              value={strong}
              onChange={(e) => {
                const s = num(e.target.value, 40, 95, strong);
                onChange({ ...spec, pct: custom ? [null, spec.pct[1], s, spec.pct[3]] : liftPct(s) });
              }}
            />
          </label>
        )}
      </div>

      {mode === 'percent' && (
        <>
          <label className="row small" style={{ gap: 10, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={!custom}
              onChange={(e) => {
                setCustom(!e.target.checked);
                if (e.target.checked) onChange({ ...spec, pct: liftPct(strong) });
              }}
              style={{ width: 20, height: 20, minHeight: 0, accentColor: 'var(--ink)' }}
            />
            <span>
              Steady and Full follow Strong ({liftPct(strong)[1]}% and {liftPct(strong)[3]}%)
            </span>
          </label>
          {custom && (
            <div className="row fields">
              <label className="field grow">
                Steady %
                <input type="number" min={40} max={95} value={spec.pct[1] ?? ''} onChange={(e) => onChange({ ...spec, pct: [null, num(e.target.value, 40, 95, spec.pct[1] ?? strong - 10), strong, spec.pct[3]] })} />
              </label>
              <label className="field grow">
                Full %
                <input type="number" min={40} max={100} value={spec.pct[3] ?? ''} onChange={(e) => onChange({ ...spec, pct: [null, spec.pct[1], strong, num(e.target.value, 40, 100, spec.pct[3] ?? strong + 5)] })} />
              </label>
            </div>
          )}
        </>
      )}

      <label className="field">
        Gentle does this instead
        <select value={spec.gentleMovement ?? spec.movement} onChange={(e) => onChange({ ...spec, gentleMovement: e.target.value })}>
          {gentleOptions.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </label>

      <label className="field">
        Coaching note <span className="muted" style={{ fontWeight: 400 }}>(optional, shown to everyone)</span>
        <input type="text" maxLength={200} placeholder="e.g. Pause 1 second at the bottom" value={spec.note ?? ''} onChange={(e) => onChange({ ...spec, note: e.target.value })} />
      </label>
      <p className="muted small">The text for all four levels is written from these settings, and everyone’s own weights come from the same numbers.</p>
    </div>
  );
}
