import type { WeekPlan } from '@/lib/programming/engine';

/** Bars for each week of a cycle; the current week is gold with "Now". */
export function CycleChart({ weeks, nowIndex = null }: { weeks: WeekPlan[]; nowIndex?: number | null }) {
  const cols = { gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` };
  return (
    <>
      <div className="cycle" style={cols} aria-hidden="true">
        {weeks.map((w) => {
          const now = nowIndex === w.index;
          const h = w.kind === 'test' ? 92 : Math.max(12, Math.round((w.pct - 50) * 1.9 + 10));
          return (
            <div key={w.index} className="col">
              {w.kind === 'test' ? 'PR' : `${w.pct}%`}
              <div className={`bar ${w.kind === 'deload' ? 'deload' : ''} ${w.kind === 'test' ? 'test' : ''} ${now ? 'now' : ''}`} style={{ height: h }} />
            </div>
          );
        })}
      </div>
      <div className="cycle" style={cols} aria-hidden="true">
        {weeks.map((w) => {
          const now = nowIndex === w.index;
          return (
            <div key={w.index} className="lab" style={now ? { color: 'var(--ink)', fontWeight: 800 } : undefined}>
              {now ? 'Now' : `Wk ${w.index + 1}`}
              <br />
              {w.label}
            </div>
          );
        })}
      </div>
    </>
  );
}
