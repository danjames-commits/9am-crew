import Link from 'next/link';
import { requireMember } from '@/lib/supabase/server';
import { MemberRow } from '@/components/admin/MemberRow';
import { Icon } from '@/components/Icon';

export const dynamic = 'force-dynamic';

export default async function MembersPage() {
  const { supabase, me } = await requireMember({ admin: true });
  const { data } = await supabase.from('profiles').select('id, display_name, level, is_admin, approved, animal').order('display_name');
  const members = data ?? [];
  const waiting = members.filter((m) => !m.approved);
  const crew = members.filter((m) => m.approved);

  return (
    <main className="screen">
      <div className="row">
        <Link href="/admin" className="avatar" style={{ background: '#fff', color: 'var(--ink)' }} aria-label="Back to program">
          <Icon name="back" />
        </Link>
        <h1 style={{ fontSize: 28 }}>Members</h1>
      </div>
      <p className="muted">
        New people sign in with their email, then wait here until an admin approves them. Admins can build and post workouts and manage members.
      </p>
      {waiting.length > 0 && (
        <section className="stack">
          <h2>Waiting for approval</h2>
          <div className="card flush list">
            {waiting.map((m) => (
              <MemberRow key={m.id} m={m} isMe={false} />
            ))}
          </div>
        </section>
      )}
      <section className="stack">
        <h2>The crew · {crew.length}</h2>
        <div className="card flush list">
          {crew.map((m) => (
            <MemberRow key={m.id} m={m} isMe={m.id === me.id} />
          ))}
        </div>
      </section>
    </main>
  );
}
