import { getCoachBrief } from './coach-brief';
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { addDays, mondayOf, todayLocal, weekday, TIME_ZONE, shortDate } from './dates';
import { nextTestIndex, positionOn } from './programming/engine';
import { aiEnabled, writeRecap } from './ai';
import { getSchedule } from './data';
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
  const [{ data: attendance }, { data: prs }, { data: people }, schedule] = await Promise.all([
    supabase.from('attendance').select('user_id, class_date').gte('class_date', monday).lte('class_date', friday),
    supabase.from('messages').select('user_id, body').eq('kind', 'pr').gte('created_at', since),
    supabase.from('profiles').select('id, display_name').eq('approved', true),
    getSchedule(supabase),
  ]);
  const name = new Map((people ?? []).map((p) => [p.id, firstName(p.display_name)]));
  const checkIns = attendance?.length ?? 0;
  const days = new Set((attendance ?? []).map((a) => a.class_date)).size;
  const regulars = new Set((attendance ?? []).map((a) => a.user_id)).size;
  const prLines = (prs ?? []).map((p) => `${name.get(p.user_id) ?? 'Someone'}: ${p.body}`);

  const nextMonday = addDays(monday, 7);
  const next = positionOn(nextMonday, schedule);
  const cyc = next.resolved;
  const nextWeek =
    next.week.kind === 'test'
      ? 'Test week: everyone goes for a new best.'
      : next.week.kind === 'deload'
        ? 'An ease-off week: lighter weights so everyone recovers.'
        : `${next.week.index === 0 ? `A new cycle starts${cyc.name ? ` (${cyc.name})` : ''}. ` : ''}Week ${next.week.index + 1} of ${next.totalWeeks}: ${next.week.label.toLowerCase()} week, main lifts around ${next.week.pct}%.`;
  const testIndex = nextTestIndex(cyc.weeks, next.week.index);
  const testLine = testIndex >= 0 ? `Test week starts ${shortDate(addDays(cyc.start, testIndex * 7))}.` : '';

  const facts = `Week of ${shortDate(monday)}.
Check-ins: ${checkIns} across ${days} class days, ${regulars} different people.
New personal bests this week: ${prLines.length ? prLines.join('; ') : 'none logged this week'}.
Crew goals this cycle: ${cyc.goals.length ? cyc.goals.join('; ') : 'none set'}.
Next week: ${nextWeek}
${testLine}`;

  try {
    const brief = await getCoachBrief(supabase);
    const body = await writeRecap(facts, brief.body);
    await supabase.rpc('post_weekly_recap', { p_week: monday, p_body: body });
  } catch {
    // Try again on the next visit.
  }
}
