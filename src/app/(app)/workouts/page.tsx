import { requireMember, signedIn } from '@/lib/supabase/server';
import { addDays, classDays, nextClassDate, shortDate, todayLocal } from '@/lib/dates';
import { CycleStrip } from '@/components/CycleStrip';
import { WeekDigest, type DigestDay } from '@/components/WeekDigest';
import { getSchedule } from '@/lib/data';
import { positionOn } from '@/lib/programming/engine';
import { Icon } from '@/components/Icon';
import type { Part } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function WorkoutsPage() {
  const { supabase } = await signedIn();
  const first = nextClassDate();
  // From this week's Monday, three weeks of class days, so the digest shows the whole week.
  const monday = addDays(first, -((new Date(first + 'T12:00:00Z').getUTCDay() + 6) % 7));
  const days = classDays(monday, 15);
  const [{ me }, { data: workouts }, schedule] = await Promise.all([
    requireMember(),
    supabase.from('workouts').select('class_date, title, focus, status, parts').gte('class_date', days[0]).lte('class_date', days[days.length - 1]),
    getSchedule(supabase),
  ]);
  const byDate = new Map((workouts ?? []).map((w) => [w.class_date, { ...w, parts: (w.parts ?? []) as Part[] }]));
  const today = todayLocal();

  const weeks: DigestDay[][] = [];
  for (const d of days) {
    const last = weeks[weeks.length - 1];
    const day: DigestDay = { date: d, workout: byDate.get(d) ?? null };
    if (!last || new Date(d + 'T12:00:00Z').getUTCDay() === 1) weeks.push([day]);
    else last.push(day);
  }
  const label = (week: DigestDay[]) => {
    const pos = positionOn(week[0].date, schedule);
    return pos.started ? `Week ${pos.week.index + 1}/${pos.totalWeeks} · ${pos.week.label}` : undefined;
  };

  return (
    <main className="screen">
      <h1>Workouts</h1>
      <CycleStrip schedule={schedule} />
      <WeekDigest days={weeks[0]} today={today} isAdmin={me.is_admin} heading="This week" sub={label(weeks[0])} />
      {weeks.slice(1).map((week, i) => (
        <details key={week[0].date} className="week-fold">
          <summary>
            <span className="eyebrow">{i === 0 ? 'Next week' : `Week of ${shortDate(week[0].date).split(' · ')[1]}`}</span>
            <span className="muted small">{label(week)}</span>
            <span className="chev">
              <Icon name="next" size={18} />
            </span>
          </summary>
          <WeekDigest days={week} today={today} isAdmin={me.is_admin} heading="" />
        </details>
      ))}
    </main>
  );
}
