'use client';
import { useState, useTransition } from 'react';
import { logBenchmark } from '@/app/actions';
import type { Benchmark } from '@/lib/benchmarks';
import { LEVELS } from '@/lib/types';
import { partialRound, type RoundItem } from '@/lib/round-parse';

const UNIT: Partial<Record<Benchmark['score'], string>> = { distance: 'Metres', weight: 'Pounds', calories: 'Calories' };

/**
 * Log a benchmark result. On the Benchmarks page you pick the benchmark and date;
 * on a workout (fixed) the benchmark and day come from the workout, so it's just the score.
 */
export function BenchmarkLogForm({
  benchmarks,
  myLevel,
  today,
  fixed,
  onDone,
}: {
  benchmarks: Benchmark[];
  myLevel: number;
  today: string;
  /** Logging from a workout: this benchmark, this day, this level. */
  fixed?: { benchmarkId: number; date: string; level: number; round?: RoundItem[]; rounds?: number };
  onDone?: () => void;
}) {
  const [benchmarkId, setBenchmarkId] = useState<number>(fixed?.benchmarkId ?? benchmarks[0]?.id);
  const [level, setLevel] = useState<number>(fixed?.level ?? myLevel);
  const [date, setDate] = useState(fixed ? (fixed.date > today ? today : fixed.date) : today);
  const [unknownDate, setUnknownDate] = useState(false);
  const [min, setMin] = useState('');
  const [sec, setSec] = useState('');
  const [rounds, setRounds] = useState(fixed?.rounds ? String(fixed.rounds) : '');
  // How far into the unfinished round, movement by movement (when the workout lists them).
  const roundItems = fixed?.round ?? [];
  const [partial, setPartial] = useState<number[]>(() => roundItems.map(() => 0));
  const [reps, setReps] = useState('');
  const [amount, setAmount] = useState('');
  const [capped, setCapped] = useState(false);
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState<{ ok?: string; error?: string; party?: boolean } | null>(null);
  const [pending, start] = useTransition();
  const b = benchmarks.find((x) => x.id === benchmarkId);
  if (!b) return null;

  function reset() {
    setMin('');
    setSec('');
    setRounds('');
    setReps('');
    setAmount('');
    setCapped(false);
    setNote('');
    setPartial(roundItems.map(() => 0));
  }

  function setPart(i: number, v: number) {
    const next = partial.map((x, j) => (j === i ? Math.max(0, Math.min(roundItems[i].count, v)) : x));
    setPartial(next);
    const { reps: r } = partialRound(roundItems, next);
    setReps(r ? String(r) : '');
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    start(async () => {
      const r = await logBenchmark({
        benchmark_id: b!.id,
        done_on: unknownDate ? null : date,
        level,
        time: min || sec ? `${Number(min || 0)}:${String(Number(sec || 0)).padStart(2, '0')}` : '',
        rounds,
        reps,
        amount,
        capped,
        note: [note.trim(), b!.score === 'rounds_reps' ? partialRound(roundItems, partial).note : ''].filter(Boolean).join(' · ').slice(0, 300),
        workout_date: fixed?.date ?? null,
      });
      if ('error' in r && r.error) return setMsg({ error: r.error });
      reset();
      if ('ok' in r) {
        setMsg(
          r.isBest
            ? { ok: `New best on ${b!.name}!`, party: true }
            : { ok: r.first ? 'Saved. That’s your starting point.' : 'Saved.' },
        );
      }
      onDone?.();
    });
  }

  const timeFields = (
    <div className="row fields">
      <label className="field grow">
        Minutes
        <input type="number" inputMode="numeric" min={0} max={999} value={min} onChange={(e) => setMin(e.target.value)} />
      </label>
      <label className="field grow">
        Seconds
        <input type="number" inputMode="numeric" min={0} max={59} value={sec} onChange={(e) => setSec(e.target.value)} />
      </label>
    </div>
  );

  return (
    <form onSubmit={save} className="stack">
      {!fixed && (
        <label className="field">
          Benchmark
          <select
            value={benchmarkId}
            onChange={(e) => {
              setBenchmarkId(Number(e.target.value));
              reset();
              setMsg(null);
            }}
          >
            {benchmarks.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {!fixed && b.description && <p className="muted small" style={{ marginTop: -4 }}>{b.description}</p>}

      {b.score === 'time' &&
        (capped ? (
          <label className="field">
            Reps when time ran out
            <input type="number" inputMode="numeric" min={0} value={reps} onChange={(e) => setReps(e.target.value)} />
          </label>
        ) : (
          timeFields
        ))}
      {b.score === 'time' && b.better === 'lower' && (
        <button type="button" className="link-btn" onClick={() => setCapped((c) => !c)}>
          {capped ? 'I finished: enter my time instead' : 'Hit the time cap? Enter reps instead'}
        </button>
      )}
      {b.score === 'rounds_reps' && (
        <div className="row fields">
          <label className="field grow">
            Rounds
            <input type="number" inputMode="numeric" min={0} value={rounds} onChange={(e) => setRounds(e.target.value)} />
          </label>
          <label className="field grow">
            + Extra reps
            <input type="number" inputMode="numeric" min={0} value={reps} onChange={(e) => setReps(e.target.value)} />
          </label>
        </div>
      )}
      {b.score === 'rounds_reps' && roundItems.length > 0 && (
        <div className="stack tight">
          <div className="field-label">In the round you didn’t finish</div>
          <div className="partial-list">
            {roundItems.map((it, i) => (
              <div key={i} className="partial-row">
                <span className="grow">
                  {it.name} <span className="muted small">/ {it.count}{it.unit === 'reps' ? '' : ` ${it.unit}`}</span>
                </span>
                <button type="button" className="partial-step" aria-label={`Fewer ${it.name}`} onClick={() => setPart(i, partial[i] - (it.unit === 'm' ? 5 : 1))} disabled={!partial[i]}>
                  −
                </button>
                <span className="partial-n">{partial[i]}</span>
                <button type="button" className="partial-step" aria-label={`More ${it.name}`} onClick={() => setPart(i, partial[i] + (it.unit === 'm' ? 5 : 1))} disabled={partial[i] >= it.count}>
                  +
                </button>
                <button type="button" className={`partial-all ${partial[i] === it.count ? 'on' : ''}`} onClick={() => setPart(i, partial[i] === it.count ? 0 : it.count)}>
                  All
                </button>
              </div>
            ))}
          </div>
          <p className="muted small" style={{ margin: 0 }}>Extra reps fills in from this. Carries, runs and calories go in your note.</p>
        </div>
      )}
      {b.score === 'reps' && (
        <label className="field">
          Reps
          <input type="number" inputMode="numeric" min={0} value={reps} onChange={(e) => setReps(e.target.value)} />
        </label>
      )}
      {UNIT[b.score] && (
        <label className="field">
          {UNIT[b.score]}
          <input type="number" inputMode="decimal" min={0} step="0.1" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
      )}

      <div className="stack tight">
        <div className="field-label">Level you did</div>
        <div className="segmented" role="group" aria-label="Level you did">
          {LEVELS.map((l) => (
            <button type="button" key={l.n} aria-pressed={level === l.n} onClick={() => setLevel(l.n)}>
              {l.name}
            </button>
          ))}
        </div>
      </div>

      {!fixed && (
        <label className="field">
          Date
          <input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} required={!unknownDate} disabled={unknownDate} />
        </label>
      )}
      {!fixed && (
        <label className="row check" style={{ marginTop: -6 }}>
          <input type="checkbox" checked={unknownDate} onChange={(e) => setUnknownDate(e.target.checked)} />
          <span>
            I don’t remember when
            <span className="muted small" style={{ display: 'block' }}>Counts toward your bests, but isn’t called a new best.</span>
          </span>
        </label>
      )}
      <label className="field">
        Note (optional)
        <input type="text" maxLength={200} value={note} placeholder={b.score === 'time' ? 'e.g. rowed instead, paused once' : 'e.g. banded pull-ups'} onChange={(e) => setNote(e.target.value)} />
      </label>

      <button className="btn primary big" disabled={pending}>
        {pending ? 'Saving…' : 'Save result'}
      </button>
      {msg?.error && (
        <div className="notice bad" role="alert">
          {msg.error}
        </div>
      )}
      {msg?.ok && (
        <div className={`notice ${msg.party ? 'party' : 'good'}`} role="status">
          {msg.ok}
        </div>
      )}
    </form>
  );
}
