import Link from 'next/link';
import { requireMember, signedIn } from '@/lib/supabase/server';
import { lastClassDone, shortDate } from '@/lib/dates';
import { getSchedule } from '@/lib/data';
import { positionOn } from '@/lib/programming/engine';
import { groupByWeek, pastWindow } from '@/lib/past-workouts';
import { WeekDigest } from '@/components/WeekDigest';
import { Icon } from '@/components/Icon';
import type { Part } from '@/lib/types';

/** Every published workout that's already run, newest first, 4 weeks a page. */
export default async function PastWorkoutsPage({ searchParams }: { searchParams: Promise<{ before?: string }> }) {
  const { before } = await searchParams;
  const { supabase, userId } = await signedIn();
  const lastDone = lastClassDone();
  const [{ me }, { data: first }, schedule] = await Promise.all([
    requireMember(),
    supabase.from('workouts').select('class_date').eq('status', 'published').lte('class_date', lastDone).order('class_date').limit(1).maybeSingle(),
    getSchedule(supabase),
  ]);
  const win = pastWindow({ before, lastDone, earliest: first?.class_date ?? null });

  const [{ data: workouts }, { data: mine }] =
    win.from && win.to
      ? await Promise.all([
          supabase.from('workouts').select('class_date, title, focus, status, parts').eq('status', 'published').gte('class_date', win.from).lte('class_date', win.to),
          supabase.from('attendance').select('class_date').eq('user_id', userId).gte('class_date', win.from).lte('class_date', win.to),
        ])
      : [{ data: [] }, { data: [] }];

  const weeks = groupByWeek(workouts ?? [], win.mondays);
  const attended = (mine ?? []).map((a) => a.class_date as string);
  const label = (monday: string) => {
    const pos = positionOn(monday, schedule);
    return pos.started ? `Cycle ${pos.cycle} · Week ${pos.week.index + 1}/${pos.totalWeeks} · ${pos.week.label}` : `Week of ${shortDate(monday).split(' · ')[1]}`;
  };

  return (
    <main className="screen">
      <div className="row">
        <Link href="/workouts" className="avatar" style={{ background: 'var(--card)', color: 'var(--ink)' }} aria-label="Back to workouts">
          <Icon name="back" />
        </Link>
        <h1 className="grow">Past workouts</h1>
      </div>
      {weeks.length === 0 && <p className="muted">No past workouts yet.</p>}
      {weeks.map((w) => (
        <WeekDigest
          key={w.monday}
          days={w.days.map((d) => ({ date: d.class_date, workout: { ...d, parts: (d.parts ?? []) as Part[] } }))}
          today=""
          isAdmin={me.is_admin}
          heading={label(w.monday)}
          attended={attended}
        />
      ))}
      {win.earlier && (
        <Link href={`/workouts/past?before=${win.earlier}`} className="btn ghost" style={{ alignSelf: 'center' }}>
          Show earlier
        </Link>
      )}
    </main>
  );
}
