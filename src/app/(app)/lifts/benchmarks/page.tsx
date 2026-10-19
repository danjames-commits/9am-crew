import Link from 'next/link';
import { requireMember, signedIn } from '@/lib/supabase/server';
import { getBenchmarks } from '@/lib/data';
import { shortDate, todayLocal } from '@/lib/dates';
import { bestResult, formatScore } from '@/lib/benchmarks';
import { levelName } from '@/lib/types';
import { LiftsTabs } from '@/components/LiftsTabs';
import { LogBenchmarkCard } from '@/components/LogBenchmarkCard';
import { AddBenchmark } from '@/components/admin/AddBenchmark';
import { Icon } from '@/components/Icon';

export const dynamic = 'force-dynamic';

const day = (d: string) => shortDate(d).split(' · ')[1];

export default async function BenchmarksPage() {
  const { supabase, userId } = await signedIn();
  const [{ me }, { benchmarks, results }] = await Promise.all([requireMember(), getBenchmarks(supabase, userId)]);
  const tried = benchmarks.filter((b) => results.some((r) => r.benchmark_id === b.id));
  const untried = benchmarks.filter((b) => !tried.includes(b));

  return (
    <main className="screen">
      <h1>My lifts</h1>
      <LiftsTabs current="benchmarks" />
      <p className="muted">Timed tests and named workouts. Log a result each time you do one and watch it move.</p>

      {benchmarks.length > 0 && <LogBenchmarkCard benchmarks={benchmarks} myLevel={me.level} today={todayLocal()} />}

      {tried.length > 0 ? (
        <section className="stack">
          <div className="eyebrow">Your benchmarks</div>
          <div className="card flush list">
            {tried.map((b) => {
              const mine = results.filter((r) => r.benchmark_id === b.id);
              const last = mine[mine.length - 1];
              const best = bestResult(b, mine, last.level);
              return (
                <Link key={b.id} href={`/lifts/benchmarks/${b.id}`} className="list-item">
                  <div className="grow">
                    <div style={{ fontWeight: 700 }}>{b.name}</div>
                    <div className="muted small">
                      {mine.length} {mine.length === 1 ? 'result' : 'results'} · last {day(last.done_on)}
                      {last.level ? ` · ${levelName(last.level)}` : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="muted small">Best</div>
                    <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 19 }}>{best ? formatScore(b, best) : '–'}</div>
                  </div>
                  <Icon name="next" />
                </Link>
              );
            })}
          </div>
        </section>
      ) : (
        <div className="card stack">
          <h2>Nothing logged yet</h2>
          <p className="muted">When a workout is a benchmark, like the 1 km row test or Cindy, there’s a spot to log your result right on the workout. You can also log one here.</p>
        </div>
      )}

      {untried.length > 0 && (
        <details className="card part-fold">
          <summary>
            <span className="eyebrow">All benchmarks · {untried.length} not tried yet</span>
            <span className="chev">
              <Icon name="next" size={18} />
            </span>
          </summary>
          <div className="list">
            {untried.map((b) => (
              <Link key={b.id} href={`/lifts/benchmarks/${b.id}`} className="list-item" style={{ paddingLeft: 0, paddingRight: 0 }}>
                <div className="grow">
                  <div style={{ fontWeight: 700 }}>{b.name}</div>
                  {b.description && <div className="muted small">{b.description}</div>}
                </div>
                <Icon name="next" />
              </Link>
            ))}
          </div>
        </details>
      )}

      {me.is_admin && <AddBenchmark />}
    </main>
  );
}
