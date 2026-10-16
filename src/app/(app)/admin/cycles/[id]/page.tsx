import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireMember } from '@/lib/supabase/server';
import { emptyDays, getSchedule } from '@/lib/data';
import { addDays, nextClassDate, shortDate, todayLocal } from '@/lib/dates';
import { positionOn } from '@/lib/programming/engine';
import type { PlanDraft } from '@/lib/programming/plan';
import { aiEnabled } from '@/lib/ai';
import { Icon } from '@/components/Icon';
import { CyclePlanner } from '@/components/admin/CyclePlanner';
import { DraftCycle } from '@/components/admin/DraftRun';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export default async function CyclePage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const { supabase } = await requireMember({ admin: true });
  const schedule = await getSchedule(supabase);
  const saved = schedule.cycles.find((c) => c.id === id);
  if (!saved) notFound();

  const number = positionOn(saved.start_date, schedule).cycle;
  const end = addDays(saved.start_date, saved.weeks.length * 7 - 3);
  const from = saved.start_date > todayLocal() ? saved.start_date : nextClassDate();
  const [empty, { data: movementRows }] = await Promise.all([emptyDays(supabase, from, end), supabase.from('movements').select('name').order('sort')]);
  const initial: PlanDraft = {
    start_date: saved.start_date,
    name: saved.name,
    why: saved.why,
    brief: saved.brief ?? '',
    goals: saved.goals,
    weeks: saved.weeks,
    days: saved.days,
  };

  return (
    <main className="screen">
      <div className="row">
        <Link href="/admin/cycles" className="avatar" style={{ background: '#fff', color: 'var(--ink)' }} aria-label="Back to cycle planner">
          <Icon name="back" />
        </Link>
        <div className="grow">
          <div className="eyebrow teal">
            {shortDate(saved.start_date)} – {shortDate(end)}
          </div>
          <h1 style={{ fontSize: 26 }}>
            Cycle {number}
            {saved.name ? `: ${saved.name}` : ''}
          </h1>
        </div>
        <span className="badge">ADMIN</span>
      </div>
      {aiEnabled() && end >= todayLocal() && <DraftCycle dates={empty} label={`the rest of cycle ${number}`} />}
      <CyclePlanner id={id} cycleNumber={number} initial={initial} movements={(movementRows ?? []).map((m) => m.name)} aiOn={aiEnabled()} hasPlan />
    </main>
  );
}
