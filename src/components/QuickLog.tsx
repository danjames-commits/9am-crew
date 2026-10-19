'use client';
import { useActionState, useState } from 'react';
import { logLift } from '@/app/actions';
import type { Part } from '@/lib/types';
import type { Benchmark } from '@/lib/benchmarks';
import { weightFor } from '@/lib/programming/engine';
import { shortDate } from '@/lib/dates';
import { BenchmarkLogForm } from './BenchmarkLogForm';

type LiftResult = { error?: string; ok?: boolean; isPr?: boolean; at?: number } | null;

export interface QuickLogContext {
  classDate: string;
  today: string;
  movements: { id: number; name: string }[];
  benchmarks: Benchmark[];
  maxes: Record<string, number>;
}

/** The benchmark a part is, for the version being shown (outside versions can differ). */
export function partBenchmark(p: Part, outside: boolean, benchmarks: Benchmark[]) {
  const name = outside && p.outdoor ? (p.outdoor.benchmark ?? p.benchmark) : p.benchmark;
  return name ? (benchmarks.find((b) => b.name === name) ?? null) : null;
}

/** "Log your lift" / "Log your result" right under a part of the workout. */
export function QuickLog({ part, level, outside, ctx, big = false }: { part: Part; level: number; outside: boolean; ctx: QuickLogContext; big?: boolean }) {
  const bench = partBenchmark(part, outside, ctx.benchmarks);
  // Before the day: say it's a benchmark and that logging opens on the day.
  if (ctx.classDate > ctx.today) {
    return bench ? (
      <div className="bench-ahead small">
        <b>★ Benchmark: {bench.name}.</b> Log your result right here on {shortDate(ctx.classDate).split(' · ')[0]}.
      </div>
    ) : null;
  }
  if (bench) {
    return <QuickBenchmark bench={bench} level={level} ctx={ctx} big={big} />;
  }
  const lift = part.lift;
  // Gentle does an easier movement that isn't tracked.
  if (!lift || (level === 1 && lift.gentleMovement && lift.gentleMovement !== lift.movement)) return null;
  const movement = ctx.movements.find((m) => m.name === lift.movement);
  if (!movement) return null;
  return <QuickLift part={part} level={level} movement={movement} ctx={ctx} big={big} />;
}

function QuickBenchmark({ bench, level, ctx, big }: { bench: Benchmark; level: number; ctx: QuickLogContext; big: boolean }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button type="button" className={`btn ${big ? 'big' : ''} log-btn`} onClick={() => setOpen(true)}>
        + Log your {bench.name} result
      </button>
    );
  }
  return (
    <div className="quick-log stack tight">
      <div className="row between">
        <b>Your {bench.name} result</b>
        <button type="button" className="btn small ghost" onClick={() => setOpen(false)}>
          Close
        </button>
      </div>
      <BenchmarkLogForm benchmarks={[bench]} myLevel={level} today={ctx.today} fixed={{ benchmarkId: bench.id, date: ctx.classDate, level }} />
    </div>
  );
}

function QuickLift({ part, level, movement, ctx, big }: { part: Part; level: number; movement: { id: number; name: string }; ctx: QuickLogContext; big: boolean }) {
  const [state, action, pending] = useActionState<LiftResult, FormData>(logLift as (s: LiftResult, f: FormData) => Promise<LiftResult>, null);
  const [open, setOpen] = useState(false);
  const lift = part.lift!;
  const i = level - 1;
  const text = part.versions[i] ?? '';
  const scheme = text.match(/(\d+)\s*[×x]\s*(\d+)/);
  const reps = lift.reps ?? (scheme ? Number(scheme[2]) : 5);
  const planned = weightFor(ctx.maxes[movement.name], lift.pct[i]);

  if (!open) {
    return (
      <button type="button" className={`btn ${big ? 'big' : ''} log-btn`} onClick={() => setOpen(true)}>
        + Log your {movement.name.toLowerCase()}
      </button>
    );
  }
  return (
    <form action={action} className="quick-log stack tight">
      <div className="row between">
        <b>Log your top set</b>
        <button type="button" className="btn small ghost" onClick={() => setOpen(false)}>
          Close
        </button>
      </div>
      <input type="hidden" name="movement_id" value={movement.id} />
      <input type="hidden" name="logged_on" value={ctx.classDate > ctx.today ? ctx.today : ctx.classDate} />
      <div className="row fields">
        <label className="field grow">
          Weight (lb)
          <input name="weight" type="number" inputMode="decimal" step="0.5" min="1" max="1999" defaultValue={planned ?? undefined} required />
        </label>
        <label className="field" style={{ width: 96 }}>
          Reps
          <input name="reps" type="number" inputMode="numeric" min="1" max="20" defaultValue={Math.min(20, reps)} required />
        </label>
      </div>
      <button className="btn primary" disabled={pending}>
        {pending ? 'Saving…' : 'Save lift'}
      </button>
      {state?.error && <div className="notice bad" role="alert">{state.error}</div>}
      {state?.ok && state.isPr && (
        <div className="notice party" role="status">
          New personal best! The crew has been told.
        </div>
      )}
      {state?.ok && !state.isPr && <div className="notice good" role="status">Saved to My stats.</div>}
    </form>
  );
}
