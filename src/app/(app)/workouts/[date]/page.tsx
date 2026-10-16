import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireMember } from '@/lib/supabase/server';
import { getBests, getPeople } from '@/lib/data';
import { longDate, todayLocal } from '@/lib/dates';
import { CheckIn } from '@/components/CheckIn';
import type { Part } from '@/lib/types';
import { WorkoutView } from '@/components/WorkoutView';
import { classWeather } from '@/lib/weather';
import { Icon } from '@/components/Icon';
import { aiEnabled } from '@/lib/ai';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export default async function WorkoutPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();
  const { supabase, me } = await requireMember();

  const { data: w } = await supabase
    .from('workouts')
    .select('id, class_date, title, focus, why, parts, status')
    .eq('class_date', date)
    .maybeSingle();
  if (!w) notFound();

  const [{ names, animals }, { bests }, weather, { data: attendance }] = await Promise.all([
    getPeople(supabase),
    getBests(supabase, me.id),
    (w.parts as Part[]).some((p) => p.outdoor) ? classWeather(w.class_date) : Promise.resolve(null),
    supabase.from('attendance').select('user_id').eq('class_date', w.class_date).order('created_at'),
  ]);
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
      {upcoming && (
        <section className="card" style={{ padding: '10px 14px' }} aria-label="Who's coming">
          <CheckIn compact classDate={w.class_date} me={{ id: me.id, name: me.display_name, animal: me.animal }} others={others} going={going} />
        </section>
      )}

      <WorkoutView parts={w.parts as Part[]} myLevel={me.level} maxes={maxes} weather={weather} classDate={w.class_date} canScale={upcoming && aiEnabled()} />

    </main>
  );
}
