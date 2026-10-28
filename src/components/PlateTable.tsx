'use client';
import { useEffect, useState } from 'react';
import { BARS, planLoads, plateChange, plateList } from '@/lib/plates';

interface Line {
  label: string;
  weight: number | null;
  reps: number;
  sets: number;
}

const LOOK: Record<string, { h: number; w: number; fill: string; ink: string }> = {
  '45': { h: 60, w: 9, fill: '#2f6fdb', ink: '#fff' },
  '35': { h: 55, w: 8, fill: '#f2b705', ink: '#221829' },
  '25': { h: 50, w: 7, fill: '#3a9a4a', ink: '#fff' },
  '15': { h: 44, w: 6, fill: '#e6e2d8', ink: '#221829' },
  '10': { h: 38, w: 5, fill: '#2b2b2b', ink: '#fff' },
  '5': { h: 30, w: 5, fill: '#d7262f', ink: '#fff' },
  '2.5': { h: 24, w: 4, fill: '#7d8a91', ink: '#fff' },
  '1': { h: 19, w: 4, fill: '#b9c0c4', ink: '#221829' },
};

/** A small plate chip in the plate's colour. */
function Plate({ p, n }: { p: number; n?: number }) {
  const look = LOOK[String(p)];
  return (
    <span className="plate-chip" style={{ background: look.fill, color: look.ink }}>
      {n ? `${n} × ` : ''}
      {p}
    </span>
  );
}

/**
 * The sets, each with what to put on the bar (per side) under it, and a "Grab" list of
 * every plate the lift needs. Plates only ever go on, so it's all "add this".
 */
export function PlateTable({ lines, lightLabel }: { lines: Line[]; lightLabel: string }) {
  const [bar, setBar] = useState<number>(45);
  useEffect(() => {
    try {
      const b = Number(localStorage.getItem('bar-weight'));
      if (BARS.includes(b as (typeof BARS)[number])) setBar(b);
    } catch {}
  }, []);
  const pickBar = (b: number) => {
    setBar(b);
    try {
      localStorage.setItem('bar-weight', String(b));
    } catch {}
  };
  const loads = planLoads(lines.map((l) => l.weight), bar);
  // The heaviest set's stack is everything to grab (two of each, one per side).
  const fullest = loads.reduce<number[]>((acc, l) => (l && l.side.length > acc.length ? l.side : acc), []);
  const grab = [...new Set(fullest)].sort((a, b) => b - a).map((p) => ({ p, n: fullest.filter((x) => x === p).length * 2 }));

  return (
    <>
      {lines.some((l) => l.weight != null) && (
        <div className="plate-bars" role="group" aria-label="Bar weight">
          <span>Bar</span>
          {BARS.map((b) => (
            <button key={b} type="button" aria-pressed={bar === b} onClick={() => pickBar(b)}>
              {b} lb
            </button>
          ))}
        </div>
      )}
      {grab.length > 0 && (
        <div className="plate-grab" aria-label={`Plates to grab: ${grab.map((g) => `${g.n} × ${g.p}`).join(', ')}`}>
          <span className="plate-grab-label">Grab</span>
          {grab.map((g) => (
            <Plate key={g.p} p={g.p} n={g.n} />
          ))}
        </div>
      )}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 6 }}>
        <tbody>
          {lines.map((l, k) => {
            const load = loads[k];
            const prev = k > 0 ? loads[k - 1] : null;
            const add = load && l.weight != null && l.weight >= bar ? plateChange(prev?.side ?? [], load.side) : null;
            return (
              <tr key={k} style={{ borderTop: k ? '1px solid rgba(23,66,61,0.15)' : 'none', fontWeight: l.label === 'Work' ? 800 : 500 }}>
                <td style={{ padding: '6px 0' }}>
                  {l.label}
                  {add && (add.on.length > 0 || add.off.length > 0) && (
                    <span className="plate-add" aria-label={`Each side: ${add.off.length ? `take off ${plateList(add.off)}, ` : ''}add ${plateList(add.on)}`}>
                      {add.off.length > 0 && <span className="plate-off">off {plateList(add.off)},</span>}
                      <span>{k === 0 || !prev?.side.length ? 'each side' : 'add'}</span>
                      {add.on.map((p, i) => (
                        <Plate key={i} p={p} />
                      ))}
                    </span>
                  )}
                </td>
                <td style={{ padding: '6px 0', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {l.sets > 1 ? `${l.sets} × ` : ''}
                  {l.reps} @ {l.weight == null ? lightLabel : `${load && l.weight >= bar ? load.total : l.weight} lb`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
