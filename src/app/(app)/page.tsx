import Link from 'next/link';
import { after } from 'next/server';
import { requireMember } from '@/lib/supabase/server';
import { maybePostRecap } from '@/lib/recap';
import { getNames, recentPrs } from '@/lib/data';
import { nextClassDate, relativeDay, longDate, timeAgo, todayLocal } from '@/lib/dates';
import { firstName } from '@/lib/ui';
import { levelName } from '@/lib/types';
import { CheckIn } from '@/components/CheckIn';
import { CheerButton } from '@/components/CheerButton';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { classWeather } from '@/lib/weather';
import type { Part } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function TodayPage() {
  const { supabase, me } = await requireMember();
  after(() => maybePostRecap(supabase));
  const classDate = nextClassDate();

  const [{ data: workout }, { data: attendance }, names, prs, { count: pending }, weather] = await Promise.all([
    supabase.from('workouts').select('id, title, focus, status, parts').eq('class_date', classDate).maybeSingle(),
    supabase.from('attendance').select('user_id').eq('class_date', classDate).order('created_at'),
    getNames(supabase),
    recentPrs(supabase, me.id),
    me.is_admin
      ? supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('approved', false)
      : Promise.resolve({ count: 0 }),
    classWeather(classDate),
  ]);
  const hasOutdoor = Boolean(workout && (workout.parts as Part[] | null)?.some((p) => p.outdoor));

  const going = (attendance ?? []).some((a) => a.user_id === me.id);
  const others = (attendance ?? [])
    .filter((a) => a.user_id !== me.id)
    .map((a) => ({ id: a.user_id, name: names[a.user_id] ?? 'Member' }));
  const visibleWorkout = workout && (workout.status === 'published' || me.is_admin) ? workout : null;

  return (
    <main className="screen">
      <header className="row between top">
        <div>
          <div className="eyebrow">{longDate(todayLocal())}</div>
          <h1 style={{ marginTop: 4 }}>Hi, {firstName(me.display_name)}</h1>
        </div>
        <Link href="/me" aria-label="My settings">
          <Avatar id={me.id} name={me.display_name} />
        </Link>
      </header>

      {me.is_admin && (
        <Link href="/admin" className="card row" style={{ textDecoration: 'none', color: 'inherit' }}>
          <span className="badge">ADMIN</span>
          <span className="grow">Program and workout builder{pending ? ` · ${pending} waiting for approval` : ''}</span>
          <Icon name="next" />
        </Link>
      )}

      <section className="card dark stack loose" aria-labelledby="next-class">
        <div className="row between">
          <div className="eyebrow gold" id="next-class">
            {relativeDay(classDate)} · 9:00 AM
          </div>
          <span className="badge soft">{levelName(me.level)}</span>
        </div>
        {visibleWorkout ? (
          <Link href={`/workouts/${classDate}`} style={{ color: 'inherit', textDecoration: 'none' }}>
            <h2 style={{ fontSize: 26 }}>{visibleWorkout.title}</h2>
            <p className="muted">
              {visibleWorkout.focus}
              {visibleWorkout.status === 'draft' ? ' · draft, only admins see this' : ''}
            </p>
            {weather && (
              <p className="small" style={{ marginTop: 8 }}>
                <b>{hasOutdoor ? weather.headline : weather.outside ? 'Nice morning' : weather.headline.replace('Inside today: ', 'Heads up: ')}</b>
                <br />
                <span className="muted">{weather.detail}</span>
              </p>
            )}
            <p className="small" style={{ color: 'var(--gold)', fontWeight: 700, marginTop: 6 }}>See your version →</p>
          </Link>
        ) : (
          <div>
            <h2 style={{ fontSize: 24 }}>Workout coming soon</h2>
            <p className="muted">It hasn’t been posted yet.</p>
          </div>
        )}
        <CheckIn classDate={classDate} me={{ id: me.id, name: me.display_name }} others={others} going={going} />
      </section>

      <section className="stack">
        <h2>Personal bests</h2>
        {prs.length === 0 ? (
          <div className="card muted">No new bests this week yet. Log your lifts on the My lifts tab and they’ll show up here.</div>
        ) : (
          prs.map((p) => {
            const name = names[p.user_id] ?? 'Someone';
            return (
              <div key={p.id} className="card row">
                <span className="avatar" style={{ background: 'var(--gold-soft)', color: 'var(--gold-ink)', borderRadius: 14 }}>
                  <Icon name="trophy" />
                </span>
                <div className="grow">
                  <div style={{ fontWeight: 700 }}>{p.user_id === me.id ? 'You' : firstName(name)} hit a new best</div>
                  <div className="muted">
                    {p.body} · {timeAgo(p.created_at)}
                  </div>
                </div>
                <CheerButton liftLogId={p.lift_log_id} count={p.cheers} mine={p.cheeredByMe} name={name} disabled={p.user_id === me.id} />
              </div>
            );
          })
        )}
      </section>
    </main>
  );
}
