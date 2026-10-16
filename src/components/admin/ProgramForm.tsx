'use client';
import { useState, useTransition } from 'react';
import { saveProgram } from '@/app/actions';

export function ProgramForm({ cycleStart, cycleWeeks, goals }: { cycleStart: string; cycleWeeks: number; goals: string[] }) {
  const [start, setStart] = useState(cycleStart);
  const [weeks, setWeeks] = useState(cycleWeeks);
  const [list, setList] = useState(goals.length ? goals : ['']);
  const [msg, setMsg] = useState<{ ok?: boolean; error?: string } | null>(null);
  const [pending, run] = useTransition();

  function save(e: React.FormEvent) {
    e.preventDefault();
    run(async () => setMsg(await saveProgram({ cycle_start: start, cycle_weeks: weeks, goals: list })));
  }

  return (
    <form onSubmit={save} className="card stack loose">
      <h2>Usual pattern settings</h2>
      <div className="row fields">
        <label className="field grow">
          Cycle starts
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} required />
        </label>
        <label className="field" style={{ width: 120 }}>
          Weeks
          <select value={weeks} onChange={(e) => setWeeks(Number(e.target.value))}>
            {[4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="muted small">Cycle 1 starts on this date. Any cycle you haven’t planned in the Cycle planner uses this length, the usual pattern and these goals.</p>
      <fieldset className="stack tight" style={{ border: 'none', padding: 0, margin: 0 }}>
        <legend className="field" style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 6 }}>
          Crew goals
        </legend>
        {list.map((g, i) => (
          <div key={i} className="row">
            <label className="sr-only" htmlFor={`goal-${i}`}>
              Goal {i + 1}
            </label>
            <input
              id={`goal-${i}`}
              type="text"
              value={g}
              maxLength={60}
              placeholder="e.g. First strict pull-up"
              onChange={(e) => setList(list.map((x, j) => (j === i ? e.target.value : x)))}
            />
            <button type="button" className="btn small ghost" aria-label={`Remove goal ${i + 1}`} onClick={() => setList(list.filter((_, j) => j !== i))}>
              Remove
            </button>
          </div>
        ))}
        {list.length < 8 && (
          <button type="button" className="btn small ghost" style={{ alignSelf: 'flex-start' }} onClick={() => setList([...list, ''])}>
            + Add goal
          </button>
        )}
      </fieldset>
      <button className="btn primary" disabled={pending}>
        {pending ? 'Saving…' : 'Save settings'}
      </button>
      {msg?.ok && <div className="notice good" role="status">Saved.</div>}
      {msg?.error && <div className="notice bad" role="alert">{msg.error}</div>}
    </form>
  );
}
