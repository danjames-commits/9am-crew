import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireMember } from '@/lib/supabase/server';
import { getSchedule } from '@/lib/data';
import { daysBetween, mondayOf, nextClassDate, shortDate } from '@/lib/dates';
import { positionOn } from '@/lib/programming/engine';
import { builtInPlan } from '@/lib/programming/plan';
import { aiEnabled } from '@/lib/ai';
import { Icon } from '@/components/Icon';
import { CyclePlanner } from '@/components/admin/CyclePlanner';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export default async function NewCyclePage({ searchParams }: { searchParams: Promise<{ start?: string }> }) {
  const { supabase } = await requireMember({ admin: true });
  const schedule = await getSchedule(supabase);
  const today = nextClassDate();
  const asked = (await searchParams).start;
  const start = asked && /^\d{4}-\d{2}-\d{2}$/.test(asked) ? mondayOf(asked) : positionOn(today, schedule).resolved.end;

  const already = schedule.cycles.find((c) => c.start_date === start);
  if (already) redirect(`/admin/cycles/${already.id}`);

  // Fit before the next planned cycle, if there is one.
  const next = schedule.cycles.find((c) => c.start_date > start);
  const room = next ? Math.floor(daysBetween(start, next.start_date) / 7) : 6;
  const weeks = Math.max(3, Math.min(6, room));
  const { data: movementRows } = await supabase.from('movements').select('name').order('sort');

  return (
    <main className="screen">
      <div className="row">
        <Link href="/admin/cycles" className="avatar" style={{ background: '#fff', color: 'var(--ink)' }} aria-label="Back to cycle planner">
          <Icon name="back" />
        </Link>
        <div className="grow">
          <div className="eyebrow teal">Starts {shortDate(start)}</div>
          <h1 style={{ fontSize: 26 }}>Plan cycle {positionOn(start, schedule).cycle}</h1>
        </div>
        <span className="badge">ADMIN</span>
      </div>
      <CyclePlanner
        id={null}
        cycleNumber={positionOn(start, schedule).cycle}
        initial={builtInPlan(start, [], weeks)}
        movements={(movementRows ?? []).map((m) => m.name)}
        aiOn={aiEnabled()}
        hasPlan={false}
      />
    </main>
  );
}
