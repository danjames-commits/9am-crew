import { formatScore, type Benchmark, type BenchResult } from '@/lib/benchmarks';
import { lb } from '@/lib/ui';

/** On a past workout: were you in, and what you logged that day. */
export function YourDay({
  wasIn,
  lifts,
  results,
  benchmarks,
}: {
  wasIn: boolean;
  lifts: { movement: string; weight: number; reps: number; is_pr: boolean }[];
  results: BenchResult[];
  benchmarks: Benchmark[];
}) {
  const byId = new Map(benchmarks.map((b) => [b.id, b]));
  const bench = results.flatMap((r) => {
    const b = byId.get(r.benchmark_id);
    return b ? [{ id: r.id, name: b.name, score: formatScore(b, r) }] : [];
  });
  return (
    <div className="your-day">
      <div className={wasIn ? 'your-day-in' : 'muted'}>{wasIn ? <><span aria-hidden="true">✓ </span>You were in</> : 'You weren’t in this one'}</div>
      {lifts.map((l, i) => (
        <div key={`l${i}`} className="small">
          {l.movement} · {lb(l.weight)}
          {l.reps > 1 ? ` × ${l.reps}` : ''} {l.is_pr && <span className="badge gold">BEST</span>}
        </div>
      ))}
      {bench.map((b) => (
        <div key={`b${b.id}`} className="small">
          ★ {b.name} · {b.score}
        </div>
      ))}
    </div>
  );
}
