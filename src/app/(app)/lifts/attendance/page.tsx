import { requireMember, signedIn } from '@/lib/supabase/server';
import { getPeople } from '@/lib/data';
import { todayLocal } from '@/lib/dates';
import type { AttendanceRow } from '@/lib/attendance';
import { AttendanceView } from '@/components/AttendanceView';

export const dynamic = 'force-dynamic';

export default async function AttendancePage() {
  const { supabase, userId } = await signedIn();
  const today = todayLocal();
  const [, { names, animals }, { data: att }, { data: held }] = await Promise.all([
    requireMember(),
    getPeople(supabase),
    supabase.from('attendance').select('user_id, class_date').lte('class_date', today),
    supabase.from('workouts').select('class_date').eq('status', 'published').lte('class_date', today),
  ]);
  return (
    <AttendanceView
      userId={userId}
      today={today}
      names={names}
      animals={animals}
      rows={((att ?? []) as AttendanceRow[]).filter((r) => r.user_id in names)}
      held={(held ?? []).map((w) => w.class_date)}
    />
  );
}
