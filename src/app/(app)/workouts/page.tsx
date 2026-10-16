import Link from 'next/link';
import { requireMember } from '@/lib/supabase/server';
import { classDays, nextClassDate, shortDate, relativeDay } from '@/lib/dates';
import { Icon } from '@/components/Icon';
import { CycleCard } from '@/components/CycleCard';
import { getSchedule } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function WorkoutsPage() {
  const { supabase, me } = await requireMember();
  const days = classDays(nextClassDate(), 15);
  const [{ data: workouts }, schedule] = await Promise.all([
    supabase.from('workouts').select('id, class_date, title, focus, status').gte('class_date', days[0]).lte('class_date', days[days.length - 1]),
    getSchedule(supabase),
  ]);
  const byDate = new Map((workouts ?? []).map((w) => [w.class_date, w]));

  const weeks: string[][] = [];
  for (const d of days) {
    const last = weeks[weeks.length - 1];
    if (!last || new Date(d + 'T12:00:00Z').getUTCDay() === 1) weeks.push([d]);
    else last.push(d);
  }

  return (
    <main className="screen">
      <h1>Workouts</h1>
      <CycleCard schedule={schedule} />
      {weeks.map((week, i) => (
        <section key={week[0]} className="stack">
          <div className="eyebrow">{i === 0 ? 'This week' : i === 1 ? 'Next week' : `Week of ${shortDate(week[0]).split(' · ')[1]}`}</div>
          <div className="card flush list">
            {week.map((d) => {
              const w = byDate.get(d);
              const posted = w && (w.status === 'published' || me.is_admin);
              const inner = (
                <>
                  <div className="grow">
                    <div className="eyebrow teal" style={{ fontSize: 12 }}>
                      {i === 0 && d === days[0] ? `${relativeDay(d)} · ` : ''}
                      {shortDate(d)}
                    </div>
                    {posted ? (
                      <>
                        <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 18 }}>{w!.title}</div>
                        <div className="muted small">
                          {w!.focus}
                          {w!.status === 'draft' ? ' · draft' : ''}
                        </div>
                      </>
                    ) : (
                      <div className="muted">Not posted yet</div>
                    )}
                  </div>
                  {(posted || me.is_admin) && <Icon name="next" />}
                </>
              );
              if (posted) {
                return (
                  <Link key={d} href={`/workouts/${d}`} className="list-item">
                    {inner}
                  </Link>
                );
              }
              if (me.is_admin) {
                return (
                  <Link key={d} href={`/admin/build/${d}`} className="list-item">
                    {inner}
                  </Link>
                );
              }
              return (
                <div key={d} className="list-item">
                  {inner}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </main>
  );
}
