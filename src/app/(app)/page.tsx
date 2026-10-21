import Link from 'next/link';
import { Suspense } from 'react';
import { after } from 'next/server';
import { requireMember, signedIn } from '@/lib/supabase/server';
import { maybePostRecap } from '@/lib/recap';
import { getPeople, getSchedule } from '@/lib/data';
import { WeekDigest, type DigestDay } from '@/components/WeekDigest';
import { daysBetween } from '@/lib/dates';
import { nextCycle, positionOn } from '@/lib/programming/engine';
import { classDays, nextClassDate, nextWeekday, relativeDay, longDate, todayLocal } from '@/lib/dates';
import { firstName } from '@/lib/ui';
import { levelName } from '@/lib/types';
import { CheckIn } from '@/components/CheckIn';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { classWeather } from '@/lib/weather';
import type { Part } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function TodayPage() {
  const { supabase } = await signedIn();
  const classDate = nextClassDate();

  // Started now, shown later: weather and personal bests stream in (Suspense), so they never hold up the page.
  const weatherP = classWeather(classDate);
  // The four class days after the next one, streamed in below the next-class card.
  const later = classDays(nextWeekday(classDate), 4);
  const upcomingP = Promise.all([
    supabase.from('workouts').select('class_date, title, focus, status, parts').in('class_date', later),
    supabase.from('attendance').select('class_date, user_id').in('class_date', later),
  ]).then(([{ data: ws }, { data: att }]) => ({
    dates: later,
    workouts: later.map((d) => (ws ?? []).find((w) => w.class_date === d) ?? null) as DigestDay['workout'][],
    att: (att ?? []) as { class_date: string; user_id: string }[],
  }));
  const [{ me }, { data: workout }, { data: attendance }, { names, animals }, admin] = await Promise.all([
    requireMember(),
    supabase.from('workouts').select('id, title, focus, status, parts').eq('class_date', classDate).maybeSingle(),
    supabase.from('attendance').select('user_id').eq('class_date', classDate).order('created_at'),
    getPeople(supabase),
    requireMember().then(({ me }) =>
      me.is_admin
        ? Promise.all([supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('approved', false), getSchedule(supabase)])
        : null,
    ),
  ]);
  after(() => maybePostRecap(supabase));
  const pending = admin?.[0].count ?? 0;
  const schedule = admin?.[1] ?? null;
  const hasOutdoor = Boolean(workout && (workout.parts as Part[] | null)?.some((p) => p.outdoor));

  const planNext = schedule
    ? daysBetween(classDate, positionOn(classDate, schedule).resolved.end) <= 14 && !nextCycle(classDate, schedule).saved
    : false;
  const going = (attendance ?? []).some((a) => a.user_id === me.id);
  const others = (attendance ?? [])
    .filter((a) => a.user_id !== me.id)
    .map((a) => ({ id: a.user_id, name: names[a.user_id] ?? 'Member', animal: animals[a.user_id] }));
  const visibleWorkout = workout && (workout.status === 'published' || me.is_admin) ? workout : null;

  return (
    <main className="screen">
      <header className="row between top">
        <div>
          <div className="eyebrow">{longDate(todayLocal())}</div>
          <h1 style={{ marginTop: 4 }}>Hi, {firstName(me.display_name)}</h1>
        </div>
        <Link href="/me" aria-label="My settings">
          <Avatar id={me.id} name={me.display_name} animal={me.animal} />
        </Link>
      </header>

      {me.is_admin && (
        <Link href="/admin" className="card row" style={{ textDecoration: 'none', color: 'inherit' }}>
          <span className="badge">ADMIN</span>
          <span className="grow">
            Program and workout builder{pending ? ` · ${pending} waiting for approval` : ''}
            {planNext ? ' · time to plan the next cycle' : ''}
          </span>
          <Icon name="next" />
        </Link>
      )}

      <section className="card dark stack loose" aria-labelledby="next-class">
        <div className="row between">
          <div className="eyebrow gold" id="next-class">
            {relativeDay(classDate)} · 9:00 AM
          </div>
        </div>
        {visibleWorkout ? (
          <Link href={`/workouts/${classDate}`} style={{ color: 'inherit', textDecoration: 'none' }}>
            <h2 style={{ fontSize: 26 }}>{visibleWorkout.title}</h2>
            {visibleWorkout.status === 'draft' && <p className="muted">Draft, only admins see this</p>}
            <Suspense fallback={null}>
              <WeatherLine weather={weatherP} hasOutdoor={hasOutdoor} />
            </Suspense>
            <p className="small" style={{ color: 'var(--gold)', fontWeight: 700, marginTop: 6 }}>See it at your level ({levelName(me.level)}) →</p>
          </Link>
        ) : (
          <div>
            <h2 style={{ fontSize: 24 }}>Workout coming soon</h2>
            <p className="muted">It hasn’t been posted yet.</p>
          </div>
        )}
        <CheckIn classDate={classDate} me={{ id: me.id, name: me.display_name, animal: me.animal }} others={others} going={going} />
      </section>

      <Suspense fallback={null}>
        <ComingUp days={upcomingP} meId={me.id} isAdmin={me.is_admin} />
      </Suspense>
    </main>
  );
}

async function WeatherLine({ weather: weatherP, hasOutdoor }: { weather: ReturnType<typeof classWeather>; hasOutdoor: boolean }) {
  const weather = await weatherP;
  if (!weather) return null;
  return (
    <p className="small" style={{ marginTop: 8 }}>
      <b>{hasOutdoor ? weather.headline : weather.outside ? 'Nice morning' : weather.headline.replace('Inside today: ', 'Heads up: ')}</b>
      <br />
      <span className="muted">{weather.detail}</span>
    </p>
  );
}

// The class days after the next one, each with an "I'm in" so you can plan your week.
async function ComingUp({ days: daysP, meId, isAdmin }: { days: Promise<{ dates: string[]; workouts: DigestDay['workout'][]; att: { class_date: string; user_id: string }[] }>; meId: string; isAdmin: boolean }) {
  const { dates, workouts, att } = await daysP;
  const others: Record<string, number> = {};
  for (const a of att) if (a.user_id !== meId) others[a.class_date] = (others[a.class_date] ?? 0) + 1;
  return (
    <WeekDigest
      heading="Coming up"
      days={dates.map((date, i) => ({ date, workout: workouts[i] }))}
      today={todayLocal()}
      isAdmin={isAdmin}
      rsvp={{ mine: att.filter((a) => a.user_id === meId).map((a) => a.class_date), others }}
    />
  );
}
