import { createClient } from '@supabase/supabase-js';
import { aiEnabled, draftClockPlan } from '@/lib/ai';
import { DEFAULT_COACH_BRIEF } from '@/lib/coach-brief';
import { partsFingerprint } from '@/lib/clock-week';
import type { Part } from '@/lib/types';

// Called by the database's schedule about 8:15 AM on class days, with a one-time ticket.
// Claude sets today's gym clock timers from the workout as it stands that morning.
// The database decides whether there's anything to do (someone signed up, published,
// not set by a coach) and checks the ticket.
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET(request: Request) {
  const ticket = new URL(request.url).searchParams.get('ticket') ?? '';
  if (!/^[0-9a-f]{64}$/.test(ticket) || !aiEnabled()) return new Response('skip', { status: 200 });
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });

  const { data } = await db.rpc('clock_job_class', { ticket });
  const job = data as { date: string; parts: Part[]; has_plan: boolean; clock_for: string | null; brief: string | null } | null;
  if (!job) return new Response('nothing to do');

  const fp = partsFingerprint(job.parts);
  if (job.has_plan && job.clock_for === fp) return new Response('up to date');

  try {
    const plan = await draftClockPlan({ parts: job.parts, brief: job.brief?.trim() || DEFAULT_COACH_BRIEF });
    await db.rpc('clock_job_save', { ticket, d: job.date, plan, fp });
    return new Response('set');
  } catch {
    return new Response('failed', { status: 500 });
  }
}
