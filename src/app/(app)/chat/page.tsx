import { after } from 'next/server';
import { requireMember, signedIn } from '@/lib/supabase/server';
import { maybePostRecap } from '@/lib/recap';
import { embeddedCheers, getPeople } from '@/lib/data';
import { ChatRoom, type ChatMessage } from '@/components/ChatRoom';

export const dynamic = 'force-dynamic';

export default async function ChatPage() {
  const { supabase } = await signedIn();
  const [{ me }, { data: recent }, { names, animals }] = await Promise.all([
    requireMember(),
    supabase
      .from('messages')
      .select('id, user_id, body, kind, lift_log_id, created_at, lift_logs(cheers(user_id))')
      .order('id', { ascending: false })
      .limit(150),
    getPeople(supabase),
  ]);
  after(() => maybePostRecap(supabase));
  const rows = (recent ?? []).reverse();
  const messages = rows.map(({ lift_logs, ...m }) => m) as ChatMessage[];
  const cheers = rows.flatMap((m) => (m.lift_log_id ? embeddedCheers(m.lift_logs).map((c) => ({ lift_log_id: m.lift_log_id as number, user_id: c.user_id })) : []));
  const count = Object.keys(names).length;

  return (
    <main className="screen" style={{ gap: 12 }}>
      <header>
        <h1>9AM Crew</h1>
        <p className="muted">{count} members</p>
      </header>
      <ChatRoom initial={messages} initialCheers={cheers} initialNames={names} initialAnimals={animals} meId={me.id} />
    </main>
  );
}
