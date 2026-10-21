import Link from 'next/link';
import { requireMember, signedIn } from '@/lib/supabase/server';
import { getBests } from '@/lib/data';
import { todayLocal, shortDate } from '@/lib/dates';
import { lb } from '@/lib/ui';
import { LogLiftForm } from '@/components/LogLiftForm';
import { LiftsTabs } from '@/components/LiftsTabs';
import { Icon } from '@/components/Icon';

export const dynamic = 'force-dynamic';

export default async function LiftsPage() {
  const { supabase, userId } = await signedIn();
  // requireMember keeps out people still waiting for approval.
  const [, { bests, movements }] = await Promise.all([requireMember(), getBests(supabase, userId)]);
  const latestPr = bests.filter((b) => b.lastPr).sort((a, b) => (b.lastPr! > a.lastPr! ? 1 : -1))[0];

  return (
    <main className="screen">
      <h1>My stats</h1>
      <LiftsTabs current="lifts" />

      <LogLiftForm movements={movements} today={todayLocal()} />

      {latestPr && (
        <div className="card dark row">
          <span className="avatar" style={{ background: 'var(--gold)', width: 48, height: 48 }}>
            <Icon name="trophy" />
          </span>
          <div>
            <div className="eyebrow gold">Latest personal best</div>
            <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 20 }}>
              {latestPr.movement} · {lb(latestPr.weight)}
              {latestPr.reps > 1 ? ` × ${latestPr.reps}` : ''}
            </div>
            <div className="muted small">{shortDate(latestPr.lastPr!)}</div>
          </div>
        </div>
      )}

      {bests.length === 0 ? (
        <div className="card stack">
          <h2>Start with what you know</h2>
          <p className="muted">
            Log a recent lift for each move, even an estimate. That becomes your starting point, and the workouts will show you your own weights.
            New bests after that get celebrated with the crew.
          </p>
        </div>
      ) : (
        <div className="card flush list">
          {bests.map((b) => {
            const top = Math.max(...b.recent);
            const bottom = Math.min(...b.recent) * 0.8;
            return (
              <Link key={b.movementId} href={`/lifts/${b.movementId}`} prefetch={false} className="list-item">
                <div className="grow">
                  <div style={{ fontWeight: 700 }}>{b.movement}</div>
                  <div className="muted small">
                    {b.lastPr ? `Best ${shortDate(b.lastPr).split(' · ')[1]}` : b.lastLogged ? `Logged ${shortDate(b.lastLogged).split(' · ')[1]}` : 'Date not remembered'}
                    {b.reps > 1 ? ` · ${b.reps} reps` : ''}
                  </div>
                </div>
                <div className="bars" aria-hidden="true">
                  {b.recent.map((v, i) => (
                    <span key={i} style={{ height: `${8 + (20 * (v - bottom)) / Math.max(1, top - bottom)}px` }} />
                  ))}
                </div>
                <div style={{ width: 80, textAlign: 'right', fontFamily: 'var(--display)', fontWeight: 800, fontSize: 19 }}>{lb(b.weight)}</div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
