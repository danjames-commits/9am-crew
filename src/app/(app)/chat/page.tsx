import { after } from 'next/server';
import { requireMember } from '@/lib/supabase/server';
import { maybePostRecap } from '@/lib/recap';
import { getPeople } from '@/lib/data';
import { ChatRoom, type ChatMessage } from '@/components/ChatRoom';

export const dynamic = 'force-dynamic';

export default async function ChatPage() {
  const { supabase, me } = await requireMember();
  after(() => maybePostRecap(supabase));
  const [{ data: recent }, { names, animals }] = await Promise.all([
    supabase.from('messages').select('id, user_id, body, kind, lift_log_id, created_at').order('id', { ascending: false }).limit(150),
    getPeople(supabase),
  ]);
  const messages = ((recent ?? []) as ChatMessage[]).reverse();
  const count = Object.keys(names).length;
  const prIds = messages.filter((m) => m.lift_log_id).map((m) => m.lift_log_id!);
  const { data: cheers } = prIds.length
    ? await supabase.from('cheers').select('lift_log_id, user_id').in('lift_log_id', prIds)
    : { data: [] };

  return (
    <main className="screen" style={{ gap: 12 }}>
      <header>
        <h1>9AM Crew</h1>
        <p className="muted">{count} members</p>
      </header>
      <ChatRoom initial={messages} initialCheers={cheers ?? []} initialNames={names} initialAnimals={animals} meId={me.id} />
    </main>
  );
}
