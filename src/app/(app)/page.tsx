import Link from 'next/link';
import { Suspense } from 'react';
import { after } from 'next/server';
import { requireMember, signedIn } from '@/lib/supabase/server';
import { maybePostRecap } from '@/lib/recap';
import { getPeople, getSchedule, recentPrs, type PrPost } from '@/lib/data';
import { daysBetween } from '@/lib/dates';
import { nextCycle, positionOn } from '@/lib/programming/engine';
import { nextClassDate, relativeDay, longDate, timeAgo, todayLocal } from '@/lib/dates';
import { firstName } from '@/lib/ui';
import { levelName } from '@/lib/types';
import { CheckIn } from '@/components/CheckIn';
import { CheerButton } from '@/components/CheerButton';
import { PrCard } from '@/components/PrCard';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { classWeather } from '@/lib/weather';
import type { Part } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function TodayPage() {
  const { supabase, userId } = await signedIn();
  const classDate = nextClassDate();

  // Started now, shown later: weather and personal bests stream in (Suspense), so they never hold up the page.
  const weatherP = classWeather(classDate);
  const prsP = recentPrs(supabase, userId);
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

      <section className="stack">
        <h2>Personal bests</h2>
        <Suspense fallback={<div className="card muted">Loading…</div>}>
          <RecentBests prs={prsP} meId={userId} names={names} isAdmin={me.is_admin} />
        </Suspense>
      </section>
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

async function RecentBests({ prs: prsP, meId, names, isAdmin }: { prs: Promise<PrPost[]>; meId: string; names: Record<string, string>; isAdmin: boolean }) {
  const prs = await prsP;
  if (prs.length === 0) {
    return <div className="card muted">No new bests this week yet. Log your lifts on the My stats tab and they’ll show up here.</div>;
  }
  return prs.map((p) => {
    const name = names[p.user_id] ?? 'Someone';
    return (
      <PrCard
        key={p.id}
        who={p.user_id === meId ? 'You' : firstName(name)}
        body={p.body}
        when={timeAgo(p.created_at)}
        art={p.art}
        artTarget={p.movementId ? { userId: p.user_id, movementId: p.movementId } : undefined}
        canRedraw={isAdmin}
        cheer={<CheerButton liftLogId={p.lift_log_id} count={p.cheers} mine={p.cheeredByMe} name={name} disabled={p.user_id === meId} />}
      />
    );
  });
}
