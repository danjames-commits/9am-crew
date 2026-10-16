'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { avatarColor, initials, firstName } from '@/lib/ui';
import { timeAgo } from '@/lib/dates';
import { Icon } from './Icon';

export interface ChatMessage {
  id: number;
  user_id: string | null;
  body: string;
  kind: 'text' | 'pr' | 'recap';
  lift_log_id: number | null;
  created_at: string;
}
interface Cheer {
  lift_log_id: number;
  user_id: string;
}

export function ChatRoom({
  initial,
  initialCheers,
  initialNames,
  meId,
}: {
  initial: ChatMessage[];
  initialCheers: Cheer[];
  initialNames: Record<string, string>;
  meId: string;
}) {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [messages, setMessages] = useState(initial);
  const [cheers, setCheers] = useState(initialCheers);
  const [names, setNames] = useState(initialNames);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottom = useRef<HTMLDivElement>(null);

  const addMessage = (m: ChatMessage) =>
    setMessages((list) => (list.some((x) => x.id === m.id) ? list : [...list, m].sort((a, b) => a.id - b.id)));

  useEffect(() => {
    const channel = supabase
      .channel('crew-chat')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (p) => addMessage(p.new as ChatMessage))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, (p) =>
        setMessages((list) => list.filter((m) => m.id !== (p.old as { id: number }).id)),
      )
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cheers' }, (p) => {
        const c = p.new as Cheer;
        setCheers((list) => (list.some((x) => x.lift_log_id === c.lift_log_id && x.user_id === c.user_id) ? list : [...list, c]));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'cheers' }, (p) => {
        const c = p.old as Cheer;
        setCheers((list) => list.filter((x) => !(x.lift_log_id === c.lift_log_id && x.user_id === c.user_id)));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  // Look up names of anyone new.
  useEffect(() => {
    const missing = [...new Set(messages.map((m) => m.user_id))].filter((id): id is string => !!id && !(id in names));
    if (!missing.length) return;
    supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', missing)
      .then(({ data }) => {
        if (data?.length) setNames((n) => ({ ...n, ...Object.fromEntries(data.map((p) => [p.id, p.display_name])) }));
      });
  }, [messages, names, supabase]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setSending(true);
    setError('');
    const { data, error } = await supabase.from('messages').insert({ body }).select().single();
    setSending(false);
    if (error) setError('Message didn’t send. Try again.');
    else {
      setText('');
      addMessage(data as ChatMessage);
    }
  }

  async function toggleCheer(liftLogId: number) {
    const mine = cheers.some((c) => c.lift_log_id === liftLogId && c.user_id === meId);
    if (mine) {
      setCheers((l) => l.filter((c) => !(c.lift_log_id === liftLogId && c.user_id === meId)));
      await supabase.from('cheers').delete().eq('lift_log_id', liftLogId).eq('user_id', meId);
    } else {
      setCheers((l) => [...l, { lift_log_id: liftLogId, user_id: meId }]);
      await supabase.from('cheers').insert({ lift_log_id: liftLogId });
    }
  }

  return (
    <>
      <div className="stack" aria-live="polite">
        {messages.length === 0 && <p className="muted center">No messages yet. Say good morning!</p>}
        {messages.map((m, i) => {
          if (m.kind === 'recap') {
            return (
              <div key={m.id} className="card teal stack tight">
                <div className="eyebrow teal">Friday recap</div>
                <p className="pre">{m.body}</p>
              </div>
            );
          }
          const name = names[m.user_id ?? ''] ?? 'Member';
          const mine = m.user_id === meId;
          const showName = !mine && (i === 0 || messages[i - 1].user_id !== m.user_id || messages[i - 1].kind === 'pr');
          if (m.kind === 'pr' && m.lift_log_id) {
            const count = cheers.filter((c) => c.lift_log_id === m.lift_log_id).length;
            const cheered = cheers.some((c) => c.lift_log_id === m.lift_log_id && c.user_id === meId);
            return (
              <div key={m.id} className="card gold row">
                <Icon name="trophy" />
                <div className="grow">
                  <b>{mine ? 'You' : firstName(name)}</b> set a new best
                  <div className="small">{m.body}</div>
                </div>
                <button
                  className={`btn small ${cheered ? 'teal' : 'ghost'}`}
                  style={{ background: cheered ? undefined : '#fff' }}
                  onClick={() => toggleCheer(m.lift_log_id!)}
                  disabled={mine}
                  aria-pressed={cheered}
                  aria-label={`Cheer for ${name}`}
                >
                  Cheer · {count}
                </button>
              </div>
            );
          }
          return (
            <div key={m.id} className="row top" style={{ justifyContent: mine ? 'flex-end' : 'flex-start' }}>
              {!mine && (
                <span className="avatar sm" style={{ background: avatarColor(m.user_id ?? ''), visibility: showName ? 'visible' : 'hidden' }} aria-hidden="true">
                  {initials(name)}
                </span>
              )}
              <div className={`bubble ${mine ? 'mine' : ''}`} title={timeAgo(m.created_at)}>
                {showName && <div className="who">{firstName(name)}</div>}
                {m.body}
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>
      <form
        onSubmit={send}
        className="row"
        style={{
          position: 'sticky',
          bottom: 'calc(var(--nav-h) + env(safe-area-inset-bottom))',
          background: 'var(--ground)',
          padding: '10px 0',
          marginBottom: -24,
        }}
      >
        <label htmlFor="msg" className="sr-only">
          Message
        </label>
        <input id="msg" placeholder="Message the crew…" value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} autoComplete="off" style={{ borderRadius: 24 }} />
        <button className="btn primary" aria-label="Send" disabled={sending || !text.trim()} style={{ width: 52, padding: 0, borderRadius: 26 }}>
          <Icon name="send" />
        </button>
      </form>
      {error && <p className="small" role="alert">{error}</p>}
    </>
  );
}
