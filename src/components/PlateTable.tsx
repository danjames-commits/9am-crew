'use client';
import { Fragment, useEffect, useState } from 'react';
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

/** One side of the bar, drawn: the sleeve with its plates, each labelled. */
function BarDrawing({ side }: { side: number[] }) {
  const H = 92;
  const mid = 42;
  const gap = 2;
  let x = 40;
  const plates = side.map((p) => {
    const look = LOOK[String(p)];
    const w = look.w * 2.6;
    const el = { p, x, w, look };
    x += w + gap;
    return el;
  });
  const sleeveEnd = Math.max(x + 18, 150);
  return (
    <svg viewBox={`0 0 ${sleeveEnd + 4} ${H}`} width="100%" height={H} role="img" aria-label={side.length ? `Each side: ${plateList(side)}` : 'Just the bar'}>
      {/* bar shaft and collar */}
      <rect x="0" y={mid - 3} width="34" height="6" rx="2" fill="#9aa3a8" />
      <rect x="32" y={mid - 9} width="7" height="18" rx="2" fill="#6d777c" />
      {/* sleeve */}
      <rect x="38" y={mid - 5} width={sleeveEnd - 38} height="10" rx="3" fill="#b9c0c4" />
      {plates.map(({ p, x: px, w, look }, k) => (
        <g key={k}>
          <rect x={px} y={mid - (look.h * 1.25) / 2} width={w} height={look.h * 1.25} rx="2.5" fill={look.fill} stroke="rgba(0,0,0,0.25)" strokeWidth="0.8" />
        </g>
      ))}
      {plates.map(({ p, x: px, w }, k) => (
        <text key={`t${k}`} x={px + w / 2} y={H - 2} textAnchor="middle" fontSize="10" fontWeight="800" fill="currentColor">
          {p}
        </text>
      ))}
    </svg>
  );
}

/** The sets table. Tap a set to see which plates go on each side, and what changes from the set before. */
export function PlateTable({ lines, lightLabel }: { lines: Line[]; lightLabel: string }) {
  const [open, setOpen] = useState<number | null>(null);
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
  const anyPlates = lines.some((l) => l.weight != null && l.weight >= bar);

  return (
    <>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 6 }}>
        <tbody>
          {lines.map((l, k) => {
            const load = loads[k];
            const canOpen = anyPlates && l.weight != null && load !== null;
            const isOpen = open === k && canOpen;
            const prev = k > 0 ? loads[k - 1] : null;
            const change = load && prev ? plateChange(prev.side, load.side) : load ? { off: [], on: load.side } : null;
            return (
              <Fragment key={k}>
                <tr
                  className={`plate-row ${canOpen ? 'tap' : ''} ${isOpen ? 'open' : ''}`}
                  style={{ borderTop: k ? '1px solid rgba(23,66,61,0.15)' : 'none', fontWeight: l.label === 'Work' ? 800 : 500 }}
                  onClick={() => canOpen && setOpen(isOpen ? null : k)}
                  onKeyDown={(e) => canOpen && (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setOpen(isOpen ? null : k))}
                  tabIndex={canOpen ? 0 : undefined}
                  role={canOpen ? 'button' : undefined}
                  aria-expanded={canOpen ? isOpen : undefined}
                >
                  <td style={{ padding: '6px 0' }}>{l.label}</td>
                  <td style={{ padding: '6px 0', textAlign: 'right' }}>
                    {l.sets > 1 ? `${l.sets} × ` : ''}
                    {l.reps} @ {l.weight == null ? lightLabel : `${l.weight} lb`}
                    {canOpen && <span className="plate-chev" aria-hidden="true">{isOpen ? '▴' : '▾'}</span>}
                  </td>
                </tr>
                {isOpen && load && (
                  <tr className="plate-detail">
                    <td colSpan={2}>
                      <BarDrawing side={load.side} />
                      <div className="plate-lines">
                        <div>
                          <b>Each side:</b> {load.side.length ? plateList(load.side) : 'nothing, just the bar'}
                          {load.total !== l.weight && <span> (makes {load.total} lb)</span>}
                        </div>
                        {change && k > 0 && (change.off.length > 0 || change.on.length > 0) && (
                          <div>
                            <b>From the last set:</b>{' '}
                            {[change.off.length ? `take off ${plateList(change.off)}` : '', change.on.length ? `put on ${plateList(change.on)}` : '']
                              .filter(Boolean)
                              .join(', then ')}{' '}
                            each side
                          </div>
                        )}
                      </div>
                      <div className="plate-bars" role="group" aria-label="Bar weight">
                        <span>Bar</span>
                        {BARS.map((b) => (
                          <button key={b} type="button" aria-pressed={bar === b} onClick={() => pickBar(b)}>
                            {b} lb
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
      {anyPlates && open === null && <div className="plate-hint">Tap a set to see the plates</div>}
    </>
  );
}
