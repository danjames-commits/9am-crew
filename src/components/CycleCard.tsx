import { addDays, mondayOf, nextClassDate, shortDate } from '@/lib/dates';
import { cyclePlan, cyclePosition, type WeekPlan } from '@/lib/programming/engine';
import type { Program } from '@/lib/data';

const monthDay = (d: string) => shortDate(d).split(' · ')[1];

function describe(w: WeekPlan) {
  if (w.kind === 'test') return 'Test week';
  if (w.kind === 'deload') return 'Ease off';
  return `${w.label} · ${w.pct}%`;
}

/** The cycle at a glance: where we are, what's next, when test week is. Shared by members and admins. */
export function CycleCard({ program, showGoals = true, showExplainer = true }: { program: Program; showGoals?: boolean; showExplainer?: boolean }) {
  const today = nextClassDate();
  const pos = cyclePosition(today, program.cycle_start, program.cycle_weeks);
  const plan = cyclePlan(program.cycle_weeks);
  const firstMonday = addDays(mondayOf(program.cycle_start), (pos.cycle - 1) * program.cycle_weeks * 7);
  const lastFriday = addDays(firstMonday, program.cycle_weeks * 7 - 3);
  const testMonday = addDays(firstMonday, (program.cycle_weeks - 1) * 7);
  const next = pos.started ? plan[pos.week.index + 1] : plan[0];

  return (
    <section className="card stack" aria-labelledby="cycle-title">
      <div className="row between">
        <h2 id="cycle-title">
          Cycle {pos.cycle} · {program.cycle_weeks} weeks
        </h2>
        <span className="muted small">
          {monthDay(firstMonday)} – {monthDay(lastFriday)}
        </span>
      </div>

      <div className="cycle" style={{ gridTemplateColumns: `repeat(${plan.length}, minmax(0, 1fr))` }} aria-hidden="true">
        {plan.map((w) => {
          const now = pos.started && w.index === pos.week.index;
          const h = w.kind === 'test' ? 92 : Math.round((w.pct - 50) * 1.9 + 10);
          return (
            <div key={w.index} className="col">
              {w.kind === 'test' ? 'PR' : `${w.pct}%`}
              <div className={`bar ${w.kind === 'deload' ? 'deload' : ''} ${w.kind === 'test' ? 'test' : ''} ${now ? 'now' : ''}`} style={{ height: h }} />
            </div>
          );
        })}
      </div>
      <div className="cycle" style={{ gridTemplateColumns: `repeat(${plan.length}, minmax(0, 1fr))` }} aria-hidden="true">
        {plan.map((w) => {
          const now = pos.started && w.index === pos.week.index;
          return (
            <div key={w.index} className="lab" style={now ? { color: 'var(--ink)', fontWeight: 800 } : undefined}>
              {now ? 'Now' : `Wk ${w.index + 1}`}
              <br />
              {w.label}
            </div>
          );
        })}
      </div>

      <div className="stack tight" style={{ background: 'var(--ground)', borderRadius: 12, padding: '10px 12px' }}>
        {pos.started ? (
          <p className="small">
            <b>This week:</b> week {pos.week.index + 1} of {program.cycle_weeks}, {describe(pos.week).toLowerCase()}
          </p>
        ) : (
          <p className="small">
            <b>Starts {shortDate(program.cycle_start).replace(' · ', ' ')}</b>
          </p>
        )}
        {next && (
          <p className="small">
            <b>{pos.started ? 'Next week' : 'First week'}:</b> {describe(next).toLowerCase()}
          </p>
        )}
        <p className="small">
          <b>Test week:</b> {monthDay(testMonday)} – {monthDay(lastFriday)}. Everyone tries for a new best.
        </p>
      </div>

      {showGoals && program.goals.length > 0 && (
        <div className="stack tight">
          <div className="eyebrow">Crew goals this cycle</div>
          <div className="row wrap" style={{ gap: 8 }}>
            {program.goals.map((g) => (
              <span key={g} className="pill">
                {g}
              </span>
            ))}
          </div>
        </div>
      )}

      {showExplainer && (
        <p className="muted small">
          Weights climb, ease off every fourth week so bodies recover, then the last week is test week. Percentages are for the Strong level; Steady is
          10% lighter, Full is 5% heavier, Gentle uses lighter tools. Your own weights show on each workout.
        </p>
      )}
    </section>
  );
}
