import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireMember, signedIn } from '@/lib/supabase/server';
import { shortDate, todayLocal } from '@/lib/dates';
import { lb } from '@/lib/ui';
import { estimateMax } from '@/lib/programming/engine';
import { deleteLift } from '@/app/actions';
import { LogLiftForm } from '@/components/LogLiftForm';
import { Icon } from '@/components/Icon';

export const dynamic = 'force-dynamic';

export default async function MovementPage({ params }: { params: Promise<{ movement: string }> }) {
  const id = Number((await params).movement);
  if (!Number.isInteger(id)) notFound();
  const { supabase, userId } = await signedIn();
  const [, { data: movement }, { data: logs }, { data: movements }] = await Promise.all([
    requireMember(),
    supabase.from('movements').select('id, name').eq('id', id).maybeSingle(),
    supabase
      .from('lift_logs')
      .select('id, weight, reps, logged_on, is_pr')
      .eq('user_id', userId)
      .eq('movement_id', id)
      .order('logged_on', { ascending: false, nullsFirst: false })
      .order('id', { ascending: false }),
    supabase.from('movements').select('id, name').order('sort'),
  ]);
  if (!movement) notFound();
  const best = Math.max(0, ...(logs ?? []).map((l) => estimateMax(Number(l.weight), l.reps)));

  return (
    <main className="screen">
      <div className="row">
        <Link href="/lifts" className="avatar" style={{ background: '#fff', color: 'var(--ink)' }} aria-label="Back to my lifts">
          <Icon name="back" />
        </Link>
        <h1 style={{ fontSize: 28 }}>{movement.name}</h1>
      </div>
      {best > 0 && (
        <div className="card teal small">
          Your estimated one-rep best is about <b>{Math.round(best)} lb</b>. Workouts use this to work out your weights.
        </div>
      )}
      <LogLiftForm movements={movements ?? []} today={todayLocal()} initialMovement={id} />
      <div className="card flush list">
        {(logs ?? []).map((l) => (
          <div key={l.id} className="list-item">
            <div className="grow">
              <div style={{ fontWeight: 700 }}>
                {lb(Number(l.weight))}
                {l.reps > 1 ? ` × ${l.reps}` : ''} {l.is_pr && <span className="badge gold">BEST</span>}
              </div>
              <div className="muted small">{l.logged_on ? shortDate(l.logged_on) : 'Date not remembered'}</div>
            </div>
            <form action={deleteLift.bind(null, l.id, id)}>
              <button className="btn small danger" aria-label={`Delete ${lb(Number(l.weight))}${l.logged_on ? ` from ${shortDate(l.logged_on)}` : ''}`}>
                Delete
              </button>
            </form>
          </div>
        ))}
        {(logs ?? []).length === 0 && <div className="list-item muted">Nothing logged yet.</div>}
      </div>
    </main>
  );
}
