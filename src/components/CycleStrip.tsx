import { addDays, nextClassDate, shortDate } from '@/lib/dates';
import { nextCycle, positionOn, type Schedule, type WeekPlan } from '@/lib/programming/engine';
import { CycleChart } from './CycleChart';

const monthDay = (d: string) => shortDate(d).split(' · ')[1];

/** Consecutive weeks with the same label make one phase: Test, Base ×3, Build ×2... */
export function phasesOf(weeks: WeekPlan[]) {
  const phases: { label: string; kind: WeekPlan['kind']; first: number; last: number }[] = [];
  for (const w of weeks) {
    const last = phases[phases.length - 1];
    if (last && last.label === w.label) last.last = w.index;
    else phases.push({ label: w.label, kind: w.kind, first: w.index, last: w.index });
  }
  return phases;
}

/** One plain sentence about what this week is for. */
export function weekSentence(w: WeekPlan) {
  if (w.kind === 'test') return 'Test week: go for a new best on the main lifts and tests.';
  if (w.kind === 'deload') return 'A lighter week, so you’re fresh for what’s next.';
  return `Lifts are at ${w.pct}% of your best this week (${w.sets} × ${w.reps}). Weights climb a little each week.`;
}

/** The cycle in one glance: the phases as a strip, a "you are here", and what's coming. */
export function CycleStrip({ schedule }: { schedule: Schedule }) {
  const today = nextClassDate();
  const pos = positionOn(today, schedule);
  const c = pos.resolved;
  const now = pos.started ? pos.week.index : -1;
  const phases = phasesOf(c.weeks);
  const current = phases.find((p) => now >= p.first && now <= p.last);
  const nextPhase = phases.find((p) => p.first > now);
  const following = nextCycle(today, schedule);

  return (
    <section className="card stack" aria-labelledby="cycle-title">
      <div className="row between top">
        <div>
          <div className="eyebrow">
            Cycle {pos.cycle} · {monthDay(c.start)} – {monthDay(addDays(c.end, -3))}
          </div>
          <h2 id="cycle-title" style={{ marginTop: 2 }}>
            {c.name ?? `${c.weeks.length}-week cycle`}
          </h2>
        </div>
      </div>

      <div className="phase-strip" role="img" aria-label={`${phases.map((p) => p.label).join(', ')}. ${pos.started ? `Now in week ${now + 1} of ${c.weeks.length}` : 'Not started yet'}.`}>
        {phases.map((p) => {
          const here = p === current;
          const done = now > p.last;
          return (
            <div key={p.first} className={`phase ${p.kind} ${here ? 'here' : ''} ${done ? 'done' : ''}`} style={{ flexGrow: p.last - p.first + 1 }}>
              <div className="phase-bar">
                {Array.from({ length: p.last - p.first + 1 }, (_, k) => (
                  <span key={k} className={p.first + k === now ? 'now' : ''} />
                ))}
              </div>
              <div className="phase-label">{p.label}</div>
            </div>
          );
        })}
      </div>

      <div className="stack tight cycle-now">
        {pos.started ? (
          <>
            <p>
              <b>
                Week {now + 1} of {c.weeks.length}
                {current ? ` · ${current.label}` : ''}.
              </b>{' '}
              {weekSentence(pos.week)}
            </p>
            {nextPhase && (
              <p className="muted small">
                Next: <b>{nextPhase.label}</b> from {monthDay(addDays(c.start, nextPhase.first * 7))}.
              </p>
            )}
            {!nextPhase && (
              <p className="muted small">
                Then cycle {following.number}
                {following.name ? `, ${following.name},` : ''} starts {monthDay(following.start)}.
              </p>
            )}
          </>
        ) : (
          <p>
            <b>Starts {monthDay(c.start)}.</b> {c.weeks[0] ? weekSentence(c.weeks[0]) : ''}
          </p>
        )}
      </div>

      <details className="part-fold">
        <summary>
          <span className="small" style={{ fontWeight: 700 }}>
            More about this cycle
          </span>
          <span className="chev">
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </summary>
        <div className="stack">
          <CycleChart weeks={c.weeks} nowIndex={pos.started ? now : null} />
          {c.why && <p className="small muted">{c.why}</p>}
          {c.goals.length > 0 && (
            <div className="stack tight">
              <div className="eyebrow">Crew goals</div>
              <div className="row wrap" style={{ gap: 8 }}>
                {c.goals.map((g) => (
                  <span key={g} className="pill">
                    {g}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </details>
    </section>
  );
}
