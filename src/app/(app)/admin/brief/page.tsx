import Link from 'next/link';
import { requireMember } from '@/lib/supabase/server';
import { DEFAULT_COACH_BRIEF, getCoachBrief } from '@/lib/coach-brief';
import { getPeople } from '@/lib/data';
import { shortDate } from '@/lib/dates';
import { CoachBriefForm } from '@/components/admin/CoachBriefForm';
import { Icon } from '@/components/Icon';

export const dynamic = 'force-dynamic';

export default async function CoachBriefPage() {
  const { supabase } = await requireMember({ admin: true });
  const [brief, { names }] = await Promise.all([getCoachBrief(supabase), getPeople(supabase)]);
  const when = brief.updatedAt ? new Date(brief.updatedAt) : null;
  const edited = when
    ? `Last edited by ${(brief.updatedBy && names[brief.updatedBy]) || 'an admin'}, ${shortDate(when.toLocaleDateString('en-CA', { timeZone: 'America/Halifax' })).split(' · ')[1]}${brief.edited ? '' : ' (reset to the starting version)'}`
    : 'Starting version. Nobody has edited it yet.';

  return (
    <main className="screen">
      <div className="row" style={{ gap: 10 }}>
        <Link href="/admin" className="avatar" style={{ background: '#fff', color: 'var(--ink)' }} aria-label="Back to Program">
          <Icon name="back" />
        </Link>
        <h1 style={{ fontSize: 28 }}>Coach brief</h1>
      </div>
      <p className="muted">
        Claude reads this every time it writes a workout, plans a cycle, helps someone scale, or writes the Friday recap. Tell it who we are, what we have,
        and how we like to train. Good things to add: favourite warm-ups, movements to avoid, how hard to push each level, things the crew loves or hates.
      </p>
      <p className="muted small">Don’t put anyone’s private health details here. For an injury, tell Claude in that day’s request instead.</p>
      <CoachBriefForm initial={brief.body} starting={DEFAULT_COACH_BRIEF} edited={edited} />
    </main>
  );
}
