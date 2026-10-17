import { addDays, nextClassDate, shortDate } from '@/lib/dates';
import { nextCycle, nextTestIndex, positionOn, type Schedule, type WeekPlan } from '@/lib/programming/engine';
import { CycleChart } from './CycleChart';

const monthDay = (d: string) => shortDate(d).split(' · ')[1];

function describe(w: WeekPlan) {
  if (w.kind === 'test') return 'test week';
  if (w.kind === 'deload') return `${w.label.toLowerCase()}, lighter`;
  return `${w.label.toLowerCase()} · ${w.pct}%`;
}

/** The cycle at a glance: where we are, what's next, when test week is. Shared by members and admins. */
export function CycleCard({ schedule, showGoals = true, showExplainer = true }: { schedule: Schedule; showGoals?: boolean; showExplainer?: boolean }) {
  const today = nextClassDate();
  const pos = positionOn(today, schedule);
  const c = pos.resolved;
  const lastFriday = addDays(c.end, -3);
  const testIndex = nextTestIndex(c.weeks, pos.started ? pos.week.index : 0);
  const testMonday = testIndex >= 0 ? addDays(c.start, testIndex * 7) : null;
  const next = pos.started ? c.weeks[pos.week.index + 1] : c.weeks[0];
  const following = nextCycle(today, schedule);

  return (
    <section className="card stack" aria-labelledby="cycle-title">
      <div className="row between top">
        <div>
          <h2 id="cycle-title">
            Cycle {pos.cycle} · {c.weeks.length} weeks
          </h2>
          {c.name && <p className="small" style={{ fontWeight: 700, color: 'var(--teal)' }}>{c.name}</p>}
        </div>
        <span className="muted small" style={{ whiteSpace: 'nowrap' }}>
          {monthDay(c.start)} – {monthDay(lastFriday)}
        </span>
      </div>

      <CycleChart weeks={c.weeks} nowIndex={pos.started ? pos.week.index : null} />

      <div className="stack tight" style={{ background: 'var(--ground)', borderRadius: 12, padding: '10px 12px' }}>
        {pos.started ? (
          <p className="small">
            <b>This week:</b> week {pos.week.index + 1} of {c.weeks.length}, {describe(pos.week)}
          </p>
        ) : (
          <p className="small">
            <b>Starts {shortDate(c.start).replace(' · ', ' ')}</b>
          </p>
        )}
        {next && (
          <p className="small">
            <b>{pos.started ? 'Next week' : 'First week'}:</b> {describe(next)}
          </p>
        )}
        {testMonday && (
          <p className="small">
            <b>Test week:</b> {monthDay(testMonday)} – {monthDay(addDays(testMonday, 4))}. Everyone tries for a new best.
          </p>
        )}
        <p className="small">
          <b>After that:</b> cycle {following.number}
          {following.name ? `, ${following.name},` : ''} starts {monthDay(following.start)}.
        </p>
      </div>

      {showGoals && c.goals.length > 0 && (
        <div className="stack tight">
          <div className="eyebrow">Crew goals this cycle</div>
          <div className="row wrap" style={{ gap: 8 }}>
            {c.goals.map((g) => (
              <span key={g} className="pill">
                {g}
              </span>
            ))}
          </div>
        </div>
      )}

      {showExplainer && (
        <p className="muted small">
          {c.why ? `${c.why} ` : 'Weights climb, ease off every fourth week so bodies recover, then the last week is test week. '}
          Percentages are for the Strong level; Steady is 10% lighter, Full is 5% heavier, Gentle uses lighter tools. Your own weights show on each
          workout.
        </p>
      )}
    </section>
  );
}
