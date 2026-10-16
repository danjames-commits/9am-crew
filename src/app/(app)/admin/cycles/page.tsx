import Link from 'next/link';
import { requireMember } from '@/lib/supabase/server';
import { getSchedule } from '@/lib/data';
import { addDays, nextClassDate, shortDate } from '@/lib/dates';
import { positionOn, type ResolvedCycle } from '@/lib/programming/engine';
import { aiEnabled } from '@/lib/ai';
import { Icon } from '@/components/Icon';
import { CycleChart } from '@/components/CycleChart';

export const dynamic = 'force-dynamic';

const monthDay = (d: string) => shortDate(d).split(' · ')[1];

export default async function CyclesPage() {
  const { supabase } = await requireMember({ admin: true });
  const schedule = await getSchedule(supabase);
  const today = nextClassDate();
  const pos = positionOn(today, schedule);

  const list: ResolvedCycle[] = [pos.resolved];
  for (let i = 0; i < 3; i++) list.push(positionOn(list[list.length - 1].end, schedule).resolved);

  return (
    <main className="screen">
      <div className="row">
        <Link href="/admin" className="avatar" style={{ background: '#fff', color: 'var(--ink)' }} aria-label="Back to program">
          <Icon name="back" />
        </Link>
        <h1 style={{ fontSize: 28 }} className="grow">
          Cycle planner
        </h1>
        <span className="badge">ADMIN</span>
      </div>
      <p className="muted">
        {aiEnabled() ? 'Plan each cycle with Claude, or by hand. ' : 'Plan each cycle by hand. '}
        A planned cycle sets the weeks, the weekday split and the goals, and every workout in those weeks follows it. Cycles you haven’t planned use the
        usual pattern.
      </p>

      {list.map((c, i) => {
        const isCurrent = i === 0;
        const future = c.start > today;
        return (
          <section key={c.start} className="card stack" aria-label={`Cycle ${c.number}`}>
            <div className="row between top">
              <div>
                <div className="eyebrow teal">{isCurrent ? (pos.started ? 'Now' : 'Up first') : 'Coming up'}</div>
                <h2>
                  Cycle {c.number} · {c.weeks.length} weeks
                </h2>
                <p className="small" style={{ fontWeight: 700, color: c.saved ? 'var(--teal)' : 'var(--ink-3)' }}>{c.saved ? c.name || 'Planned' : 'Usual pattern'}</p>
              </div>
              <span className="muted small" style={{ whiteSpace: 'nowrap' }}>
                {monthDay(c.start)} – {monthDay(addDays(c.end, -3))}
              </span>
            </div>
            <CycleChart weeks={c.weeks} nowIndex={isCurrent && pos.started ? pos.week.index : null} />
            {c.saved ? (
              <Link href={`/admin/cycles/${c.saved.id}`} className="btn outline">
                Open plan
              </Link>
            ) : future ? (
              <Link href={`/admin/cycles/new?start=${c.start}`} className={`btn ${i === 1 ? 'primary' : 'outline'}`}>
                Plan cycle {c.number}
                {aiEnabled() ? ' with Claude' : ''}
              </Link>
            ) : (
              <p className="muted small">This cycle uses the usual pattern. Change its start date or length in Settings on the Program page.</p>
            )}
          </section>
        );
      })}
    </main>
  );
}
