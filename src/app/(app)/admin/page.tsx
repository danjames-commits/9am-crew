import Link from 'next/link';
import { requireMember } from '@/lib/supabase/server';
import { getProgram } from '@/lib/data';
import { addDays, classDays, mondayOf, nextClassDate, shortDate } from '@/lib/dates';
import { aiEnabled } from '@/lib/ai';
import { DraftWeek } from '@/components/admin/DraftWeek';
import { DAY_PLAN } from '@/lib/programming/engine';
import { ProgramForm } from '@/components/admin/ProgramForm';
import { CycleCard } from '@/components/CycleCard';
import { Icon } from '@/components/Icon';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export default async function AdminPage() {
  const { supabase } = await requireMember({ admin: true });
  const program = await getProgram(supabase);
  const today = nextClassDate();

  const days = classDays(today, 10);
  const [{ data: workouts }, { count: pending }] = await Promise.all([
    supabase.from('workouts').select('class_date, title, status').gte('class_date', days[0]).lte('class_date', days[days.length - 1]),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('approved', false),
  ]);
  const byDate = new Map((workouts ?? []).map((w) => [w.class_date, w]));
  const nextToBuild = days.find((d) => !byDate.has(d));
  const thisMonday = mondayOf(today);
  const weekDays = (monday: string) =>
    [0, 1, 2, 3, 4].map((n) => addDays(monday, n)).filter((d) => d >= today).map((d) => ({ date: d, taken: byDate.has(d) }));
  const draftWeeks = [
    { label: 'This week', days: weekDays(thisMonday) },
    { label: 'Next week', days: weekDays(addDays(thisMonday, 7)) },
  ].filter((w) => w.days.length > 0);

  return (
    <main className="screen">
      <div className="row between">
        <h1>Program</h1>
        <span className="badge">ADMIN</span>
      </div>

      <CycleCard program={program} />
      {aiEnabled() && <DraftWeek weeks={draftWeeks} />}

      <section className="card flush list">
        {[1, 2, 3, 4, 5].map((d) => (
          <div key={d} className="list-item">
            <b style={{ width: 44 }}>{['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'][d]}</b>
            <span className="grow" style={{ color: d === 4 ? 'var(--teal)' : 'var(--ink-2)', fontWeight: d === 4 ? 600 : 400 }}>
              {DAY_PLAN[d].focus}
            </span>
          </div>
        ))}
      </section>

      <section className="stack">
        <div className="row between">
          <h2>Upcoming workouts</h2>
        </div>
        {nextToBuild && (
          <Link href={`/admin/build/${nextToBuild}`} className="btn primary big">
            Build next workout · {shortDate(nextToBuild)}
          </Link>
        )}
        <div className="card flush list">
          {days.map((d) => {
            const w = byDate.get(d);
            return (
              <Link key={d} href={`/admin/build/${d}`} className="list-item">
                <div className="grow">
                  <div className="eyebrow teal" style={{ fontSize: 12 }}>
                    {shortDate(d)}
                  </div>
                  <div style={{ fontWeight: w ? 700 : 400, color: w ? 'inherit' : 'var(--ink-3)' }}>{w ? w.title : 'Not built yet'}</div>
                </div>
                {w && <span className={`badge ${w.status === 'published' ? 'soft' : 'gold'}`}>{w.status === 'published' ? 'POSTED' : 'DRAFT'}</span>}
                <Icon name="next" />
              </Link>
            );
          })}
        </div>
      </section>

      <Link href="/admin/members" className="card row" style={{ textDecoration: 'none', color: 'inherit' }}>
        <span className="grow">
          <b>Members and admins</b>
          {pending ? <span className="muted"> · {pending} waiting for approval</span> : null}
        </span>
        <Icon name="next" />
      </Link>

      <ProgramForm cycleStart={program.cycle_start} cycleWeeks={program.cycle_weeks} goals={program.goals} />
    </main>
  );
}
