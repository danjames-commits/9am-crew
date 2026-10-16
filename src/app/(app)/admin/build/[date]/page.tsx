import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireMember } from '@/lib/supabase/server';
import { getProgram } from '@/lib/data';
import { isWeekday, longDate } from '@/lib/dates';
import { Builder } from '@/components/admin/Builder';
import { Icon } from '@/components/Icon';
import { classWeather } from '@/lib/weather';
import { aiEnabled } from '@/lib/ai';
import type { Part } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export default async function BuildPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !isWeekday(date)) notFound();
  const { supabase } = await requireMember({ admin: true });
  const [program, { data: existing }, weather, { data: movementRows }] = await Promise.all([
    getProgram(supabase),
    supabase.from('workouts').select('class_date, title, focus, why, parts, status').eq('class_date', date).maybeSingle(),
    classWeather(date),
    supabase.from('movements').select('name').order('sort'),
  ]);

  return (
    <main className="screen">
      <div className="row">
        <Link href="/admin" className="avatar" style={{ background: '#fff', color: 'var(--ink)' }} aria-label="Back to program">
          <Icon name="back" />
        </Link>
        <div className="grow">
          <div className="eyebrow teal">{longDate(date)} · 9:00</div>
          <h1 style={{ fontSize: 26 }}>{existing ? 'Edit workout' : 'Build workout'}</h1>
        </div>
        <span className="badge">ADMIN</span>
      </div>
      <Builder
        key={date}
        date={date}
        cycleStart={program.cycle_start}
        cycleWeeks={program.cycle_weeks}
        saved={existing ? { ...existing, parts: existing.parts as Part[] } : null}
        weather={weather}
        movements={(movementRows ?? []).map((m) => m.name)}
        aiOn={aiEnabled()}
      />
    </main>
  );
}
