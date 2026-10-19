import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireMember, signedIn } from '@/lib/supabase/server';
import { getBenchmarks } from '@/lib/data';
import { shortDate, todayLocal } from '@/lib/dates';
import { bestResult, formatScore } from '@/lib/benchmarks';
import { LEVELS, levelName } from '@/lib/types';
import { deleteBenchmarkResult } from '@/app/actions';
import { LogBenchmarkCard } from '@/components/LogBenchmarkCard';
import { Icon } from '@/components/Icon';

export const dynamic = 'force-dynamic';

export default async function BenchmarkPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const { supabase, userId } = await signedIn();
  const [{ me }, { benchmarks, results }] = await Promise.all([requireMember(), getBenchmarks(supabase, userId)]);
  const b = benchmarks.find((x) => x.id === id);
  if (!b) notFound();
  const mine = results.filter((r) => r.benchmark_id === id);
  const bests = LEVELS.map((l) => ({ level: l, best: bestResult(b, mine, l.n) })).filter((x) => x.best);
  const bestIds = new Set(bests.map((x) => x.best!.id));

  return (
    <main className="screen">
      <div className="row">
        <Link href="/lifts/benchmarks" className="avatar" style={{ background: '#fff', color: 'var(--ink)' }} aria-label="Back to benchmarks">
          <Icon name="back" />
        </Link>
        <h1 style={{ fontSize: 28 }}>{b.name}</h1>
      </div>
      {b.description && <p className="muted">{b.description}</p>}

      {bests.length > 0 && (
        <div className="card dark row wrap" style={{ gap: 18 }}>
          {bests.map(({ level, best }) => (
            <div key={level.n}>
              <div className="eyebrow gold">Best · {level.name}</div>
              <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 24 }}>{formatScore(b, best!)}</div>
              <div className="muted small">{shortDate(best!.done_on)}</div>
            </div>
          ))}
        </div>
      )}

      <LogBenchmarkCard benchmarks={benchmarks} initialId={b.id} myLevel={me.level} today={todayLocal()} startOpen={mine.length === 0} />

      {mine.length > 0 && (
        <section className="stack">
          <div className="eyebrow">Your results</div>
          <div className="card flush list">
            {[...mine].reverse().map((r) => (
              <div key={r.id} className="list-item">
                <div className="grow">
                  <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 18 }}>
                    {formatScore(b, r)} {bestIds.has(r.id) && <span className="badge">BEST</span>}
                  </div>
                  <div className="muted small">
                    {shortDate(r.done_on)}
                    {r.level ? ` · ${levelName(r.level)}` : ''}
                    {r.note ? ` · ${r.note}` : ''}
                  </div>
                </div>
                <form action={deleteBenchmarkResult.bind(null, r.id, b.id)}>
                  <button className="btn small ghost" aria-label="Delete this result">
                    Delete
                  </button>
                </form>
              </div>
            ))}
          </div>
          <p className="muted small">Each level does a different version, so bests are kept per level.</p>
        </section>
      )}
    </main>
  );
}
