import { after } from 'next/server';
import { requireMember, signedIn } from '@/lib/supabase/server';
import { maybePostRecap } from '@/lib/recap';
import { embeddedCheers, embeddedMovement, getPeople } from '@/lib/data';
import { prArtUrls } from '@/lib/pr-art';
import { ChatRoom, type ChatMessage } from '@/components/ChatRoom';

export const dynamic = 'force-dynamic';

export default async function ChatPage() {
  const { supabase } = await signedIn();
  const [{ me }, { data: recent }, { names, animals }, { data: read }] = await Promise.all([
    requireMember(),
    supabase
      .from('messages')
      .select('id, user_id, body, kind, lift_log_id, created_at, lift_logs(movement_id, cheers(user_id))')
      .order('id', { ascending: false })
      .limit(150),
    getPeople(supabase),
    // When you last looked, so the room can mark where you left off.
    supabase.from('chat_reads').select('read_at').maybeSingle(),
  ]);
  after(() => maybePostRecap(supabase));
  const rows = (recent ?? []).reverse();
  const messages = rows.map(({ lift_logs, ...m }) => m) as ChatMessage[];
  const cheers = rows.flatMap((m) => (m.lift_log_id ? embeddedCheers(m.lift_logs).map((c) => ({ lift_log_id: m.lift_log_id as number, user_id: c.user_id })) : []));
  const count = Object.keys(names).length;
  // Personal-best drawings, by message.
  const prRows = rows.filter((m) => m.kind === 'pr' && m.user_id);
  const urls = await prArtUrls(supabase, prRows.map((m) => ({ userId: m.user_id as string, movementId: embeddedMovement(m.lift_logs) })));
  const art: Record<number, { url?: string; userId: string; movementId: number }> = {};
  for (const m of prRows) {
    const movementId = embeddedMovement(m.lift_logs);
    if (movementId) art[m.id] = { url: urls.get(`${m.user_id}:${movementId}`), userId: m.user_id as string, movementId };
  }

  return (
    <main className="screen" style={{ gap: 12 }}>
      <header>
        <h1>9AM Crew</h1>
        <p className="muted">{count} members</p>
      </header>
      <ChatRoom initial={messages} initialCheers={cheers} initialNames={names} initialAnimals={animals} meId={me.id} lastRead={read?.read_at ?? null} art={art} isAdmin={me.is_admin} />
    </main>
  );
}
