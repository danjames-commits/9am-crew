import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { addDays, mondayOf, todayLocal, weekday, TIME_ZONE, shortDate } from './dates';
import { cyclePosition } from './programming/engine';
import { aiEnabled, writeRecap } from './ai';
import { getProgram } from './data';
import { firstName } from './ui';

/** Hour of the day in the gym's time zone. */
function localHour(now = new Date()) {
  return Number(new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, hour: '2-digit', hourCycle: 'h23' }).format(now));
}

/** From Friday 11 AM through the weekend, the first person to open the app
 *  triggers this week's recap. It's posted once, by the app, in the chat. */
export async function maybePostRecap(supabase: SupabaseClient) {
  if (!aiEnabled()) return;
  const today = todayLocal();
  const wd = weekday(today);
  const isRecapTime = (wd === 5 && localHour() >= 11) || wd === 6 || wd === 0;
  if (!isRecapTime) return;

  const monday = mondayOf(today);
  const { data: existing } = await supabase.from('weekly_recaps').select('week_start').eq('week_start', monday).maybeSingle();
  if (existing) return;

  const friday = addDays(monday, 4);
  // Close enough to midnight Monday in Atlantic time for filtering messages.
  const since = `${monday}T03:00:00Z`;
  const [{ data: attendance }, { data: prs }, { data: people }, program] = await Promise.all([
    supabase.from('attendance').select('user_id, class_date').gte('class_date', monday).lte('class_date', friday),
    supabase.from('messages').select('user_id, body').eq('kind', 'pr').gte('created_at', since),
    supabase.from('profiles').select('id, display_name').eq('approved', true),
    getProgram(supabase),
  ]);
  const name = new Map((people ?? []).map((p) => [p.id, firstName(p.display_name)]));
  const checkIns = attendance?.length ?? 0;
  const days = new Set((attendance ?? []).map((a) => a.class_date)).size;
  const regulars = new Set((attendance ?? []).map((a) => a.user_id)).size;
  const prLines = (prs ?? []).map((p) => `${name.get(p.user_id) ?? 'Someone'}: ${p.body}`);

  const nextMonday = addDays(monday, 7);
  const next = cyclePosition(nextMonday, program.cycle_start, program.cycle_weeks);
  const nextWeek =
    next.week.kind === 'test'
      ? 'Test week: everyone goes for a new best.'
      : next.week.kind === 'deload'
        ? 'An ease-off week: lighter weights so everyone recovers.'
        : `Week ${next.week.index + 1} of ${program.cycle_weeks}: ${next.week.label.toLowerCase()} week, main lifts around ${next.week.pct}%.`;
  const testMonday = addDays(mondayOf(program.cycle_start), (next.cycle - 1) * program.cycle_weeks * 7 + (program.cycle_weeks - 1) * 7);

  const facts = `Week of ${shortDate(monday)}.
Check-ins: ${checkIns} across ${days} class days, ${regulars} different people.
New personal bests this week: ${prLines.length ? prLines.join('; ') : 'none logged this week'}.
Crew goals this cycle: ${program.goals.length ? program.goals.join('; ') : 'none set'}.
Next week: ${nextWeek}
Test week starts ${shortDate(testMonday)}.`;

  try {
    const body = await writeRecap(facts);
    await supabase.rpc('post_weekly_recap', { p_week: monday, p_body: body });
  } catch {
    // Try again on the next visit.
  }
}
