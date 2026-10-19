import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireMember, signedIn } from '@/lib/supabase/server';
import { getBenchmarks, getBests, getPeople } from '@/lib/data';
import { longDate, todayLocal } from '@/lib/dates';
import { CheckIn } from '@/components/CheckIn';
import type { Part } from '@/lib/types';
import { WorkoutView } from '@/components/WorkoutView';
import { classWeather } from '@/lib/weather';
import { Icon } from '@/components/Icon';
import { aiEnabled } from '@/lib/ai';
import { splitCoachNotes } from '@/lib/coach-notes';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export default async function WorkoutPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();
  const { supabase, userId } = await signedIn();
  const weatherP = classWeather(date); // cached, so fetching it when nothing's outdoors costs little

  const [{ me }, { data: w }, { names, animals }, { bests, movements }, { data: attendance }, coachNote, { benchmarks }] = await Promise.all([
    requireMember(),
    supabase.from('workouts').select('id, class_date, title, focus, why, parts, status').eq('class_date', date).maybeSingle(),
    getPeople(supabase),
    getBests(supabase, userId),
    supabase.from('attendance').select('user_id').eq('class_date', date).order('created_at'),
    requireMember().then(async ({ me }) =>
      me.is_admin ? (await supabase.from('workout_coach_notes').select('body').eq('class_date', date).maybeSingle<{ body: string }>()).data : null,
    ),
    getBenchmarks(supabase, userId),
  ]);
  if (!w) notFound();
  const weather = (w.parts as Part[]).some((p) => p.outdoor) ? await weatherP : null;
  const upcoming = w.class_date >= todayLocal();
  const going = (attendance ?? []).some((a) => a.user_id === me.id);
  const others = (attendance ?? []).filter((a) => a.user_id !== me.id).map((a) => ({ id: a.user_id, name: names[a.user_id] ?? 'Member', animal: animals[a.user_id] }));
  const maxes = Object.fromEntries(bests.map((b) => [b.movement, b.estMax]));

  return (
    <main className="screen">
      <div className="row">
        <Link href="/workouts" className="avatar" style={{ background: '#fff', color: 'var(--ink)' }} aria-label="Back to workouts">
          <Icon name="back" />
        </Link>
        <div className="grow">
          <div className="eyebrow teal">{longDate(w.class_date)} · 9:00</div>
          <h1 style={{ fontSize: 28 }}>{w.title}</h1>
        </div>
        {me.is_admin && (
          <Link href={`/admin/build/${w.class_date}`} className="btn small ghost">
            Edit
          </Link>
        )}
      </div>
      {w.status === 'draft' && <div className="notice bad">Draft. Only admins can see this until it’s published.</div>}
      <p className="muted">{w.focus}</p>
      {coachNote?.body && (
        <details className="card coach-notes">
          <summary>
            <span className="eyebrow">Coach notes · admins only</span>
            <span className="chev"><Icon name="next" size={18} /></span>
          </summary>
          <dl>
            {splitCoachNotes(coachNote.body).map((s, i) => (
              <div key={i} className="note-row">
                <dt>{s.label}</dt>
                <dd className="pre">{s.text}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}
      {upcoming && (
        <section className="card" style={{ padding: '10px 14px' }} aria-label="Who's coming">
          <CheckIn compact classDate={w.class_date} me={{ id: me.id, name: me.display_name, animal: me.animal }} others={others} going={going} />
        </section>
      )}

      <WorkoutView
        title={w.title}
        parts={w.parts as Part[]}
        myLevel={me.level}
        maxes={maxes}
        weather={weather}
        classDate={w.class_date}
        canScale={upcoming && aiEnabled()}
        log={{ movements, benchmarks, today: todayLocal() }}
        coach={
          me.is_admin
            ? {
                notes: coachNote?.body ?? null,
                going: (attendance ?? []).map((a) => names[a.user_id] ?? 'Member'),
              }
            : undefined
        }
      />

    </main>
  );
}
