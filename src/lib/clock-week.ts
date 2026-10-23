import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { aiEnabled, draftClockPlan, takeAllowance } from './ai';
import { getCoachBrief } from './coach-brief';
import { timerWeek } from './clock-plan';
import type { Part } from './types';

/**
 * Has Claude set the clock timers for the week's workouts that don't have any yet.
 * Runs in the background when an admin opens the app. A workout whose timers were
 * set (by Claude or a coach) is never touched again; coaches change them in coach mode.
 */
export async function fillWeekTimers(supabase: SupabaseClient, adminId: string) {
  if (!aiEnabled()) return;
  const { data: todo } = await supabase.from('workouts').select('class_date, parts').in('class_date', timerWeek()).is('clock_plan', null);
  if (!todo?.length) return;
  const brief = await getCoachBrief(supabase);
  await Promise.all(
    todo.map(async (w) => {
      try {
        if (!(await takeAllowance(supabase, adminId, 'clock'))) return;
        const plan = await draftClockPlan({ parts: w.parts as Part[], brief: brief.body });
        // Only if nobody set them meanwhile. An empty list means "no timers needed".
        await supabase.from('workouts').update({ clock_plan: plan }).eq('class_date', w.class_date).is('clock_plan', null);
      } catch {
        // Tried again next time an admin opens the app.
      }
    }),
  );
}
