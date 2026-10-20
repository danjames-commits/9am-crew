import { requireMember, signedIn } from '@/lib/supabase/server';
import { getPeople } from '@/lib/data';
import { lastClassDone } from '@/lib/dates';
import type { AttendanceRow } from '@/lib/attendance';
import { AttendanceView } from '@/components/AttendanceView';

export const dynamic = 'force-dynamic';

export default async function AttendancePage() {
  const { supabase, userId } = await signedIn();
  // Only classes that are over count: today's from 10 AM.
  const doneThrough = lastClassDone();
  const [, { names, animals }, { data: att }, { data: held }, { data: goalRows }] = await Promise.all([
    requireMember(),
    getPeople(supabase),
    supabase.from('attendance').select('user_id, class_date').lte('class_date', doneThrough),
    supabase.from('workouts').select('class_date').eq('status', 'published').lte('class_date', doneThrough),
    supabase.from('profiles').select('id, weekly_goal').eq('approved', true),
  ]);
  const ran = new Set((held ?? []).map((w) => w.class_date));
  const goals = Object.fromEntries((goalRows ?? []).map((g) => [g.id, g.weekly_goal ?? 1]));
  return (
    <AttendanceView
      userId={userId}
      doneThrough={doneThrough}
      names={names}
      animals={animals}
      goals={goals}
      // Only days a workout actually ran, for people still in the crew.
      rows={((att ?? []) as AttendanceRow[]).filter((r) => r.user_id in names && ran.has(r.class_date))}
      held={[...ran]}
    />
  );
}
