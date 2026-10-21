import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * The coaches' standing brief: who the crew is, what we have, and how we like
 * to train. Every Claude feature reads it (workout builder, cycle planner,
 * "help me scale this", Friday recap). Admins edit it on Program → Coach brief;
 * until they do, this starting version is used.
 */
export const DEFAULT_COACH_BRIEF = `WHO WE ARE
9AM Crew: about 8 to 10 people, mostly retirees and moms, all ages and abilities, relaxed and friendly. We train together every weekday at 9 AM in a small rented gym space in Charlottetown, PEI, Canada. Classes run 50 to 60 minutes. Weights are in pounds.

EQUIPMENT WE HAVE
Barbells and plates, kettlebells, dumbbells, wall balls, a few rowers, air bikes, plyo boxes, gymnastic rings, a pull-up bar and resistance bands. Road and sidewalk outside for walking and running.

HOUSE RULES
- Never partner or team work: no pairs, relays, "you go, I go", or anything that needs another person. Everyone works on their own.
- Mid-energy: we show up and work, but nobody needs to be a beast. Challenging, never punishing.
- Safe and sensible for older adults: no high-skill Olympic lifting for Gentle or Steady, no max-effort jumping, and plenty of warm-up before the main lift.
- Gentle is genuinely gentle: low impact, lighter tools, step-ups not box jumps, wall or incline push-ups, walking not running.

HOW WE PROGRAM
- Keep Thursday an easy, low-intensity day.
- Spread the main lifts so the same muscles aren't hammered on back-to-back days.
- Vary the conditioning from day to day, and give each one a short, friendly name.

HOW WE TALK
Plain and warm. Short lines, real numbers. No emoji in workouts.`;

export const BRIEF_MAX = 6000;

export interface CoachBrief {
  body: string;
  /** False while the starting version is in use. */
  edited: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
}

export async function getCoachBrief(supabase: SupabaseClient): Promise<CoachBrief> {
  const { data } = await supabase.from('program').select('coach_brief, coach_brief_at, coach_brief_by').eq('id', 1).maybeSingle();
  const body = (data?.coach_brief as string | null)?.trim();
  return {
    body: body || DEFAULT_COACH_BRIEF,
    edited: Boolean(body),
    updatedAt: (data?.coach_brief_at as string | null) ?? null,
    updatedBy: (data?.coach_brief_by as string | null) ?? null,
  };
}

/** Adds the coaches' brief under a feature's own instructions. The feature's format rules win on any clash. */
export function withBrief(rules: string, brief: string) {
  return `${rules}

---
THE COACHES' BRIEF
This is written by the crew's coaches. Follow it. If it ever clashes with the format rules above, the format rules win.

${brief.trim()}`;
}
