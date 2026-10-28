'use client';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { firstName } from '@/lib/ui';
import { Avatar } from './Avatar';
import { PersonAvatar } from './PersonAvatar';
import { timeAgo } from '@/lib/dates';
import { Icon } from './Icon';
import { PrCard } from './PrCard';
import { CheerPop } from './CheerPop';

export interface ChatMessage {
  id: number;
  user_id: string | null;
  body: string;
  kind: 'text' | 'pr' | 'recap' | 'milestone';
  lift_log_id: number | null;
  created_at: string;
}
interface Cheer {
  lift_log_id: number;
  user_id: string;
}
export interface Reaction {
  message_id: number;
  user_id: string;
  emoji: string;
}
export const REACTIONS = ['👍', '❤️', '😂', '🔥', '💪', '🎉'] as const;

export function ChatRoom({
  initial,
  initialCheers,
  initialReactions = [],
  initialNames,
  initialAnimals,
  meId,
  lastRead,
  art = {},
  isAdmin = false,
}: {
  initial: ChatMessage[];
  initialCheers: Cheer[];
  initialReactions?: Reaction[];
  initialNames: Record<string, string>;
  initialAnimals: Record<string, string | null>;
  meId: string;
  /** When you last opened the chat (null the first time). */
  lastRead: string | null;
  /** Personal-best drawings by message id (url once drawn). */
  art?: Record<number, { url?: string; userId: string; movementId: number }>;
  isAdmin?: boolean;
}) {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [messages, setMessages] = useState(initial);
  const [cheers, setCheers] = useState(initialCheers);
  const [reactions, setReactions] = useState(initialReactions);
  // The message whose emoji picker is open (tap a message to react).
  const [picking, setPicking] = useState<number | null>(null);
  useEffect(() => {
    if (picking == null) return;
    const close = (e: PointerEvent) => !(e.target as HTMLElement).closest('.react-pick, .reactable') && setPicking(null);
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [picking]);
  const [names, setNames] = useState(initialNames);
  const [animals, setAnimals] = useState(initialAnimals);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottom = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  // The message box grows with what you type (up to about six lines), then scrolls.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 150)}px`;
  }, [text]);
  const newLine = useRef<HTMLDivElement>(null);
  // Where you left off: the first message from someone else since you last looked.
  const [firstNewId] = useState(() => {
    if (!lastRead) return null;
    const since = new Date(lastRead).getTime();
    const i = initial.findIndex((m) => m.user_id !== meId && new Date(m.created_at).getTime() > since);
    return i > 0 ? initial[i].id : null;
  });

  // Opening the chat (and anything that arrives while it's open) counts as read.
  useEffect(() => {
    const timer = setTimeout(() => supabase.rpc('mark_chat_read').then(() => {}), 300);
    return () => clearTimeout(timer);
  }, [messages.length, supabase]);
  useEffect(() => () => void supabase.rpc('mark_chat_read').then(() => {}), [supabase]);

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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'message_reactions' }, (p) => {
        const r = p.new as Reaction;
        setReactions((list) => (list.some((x) => same(x, r)) ? list : [...list, r]));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'message_reactions' }, (p) => {
        const r = p.old as Reaction;
        setReactions((list) => list.filter((x) => !same(x, r)));
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
      .select('id, display_name, animal')
      .in('id', missing)
      .then(({ data }) => {
        if (data?.length) {
          setNames((n) => ({ ...n, ...Object.fromEntries(data.map((p) => [p.id, p.display_name])) }));
          setAnimals((a) => ({ ...a, ...Object.fromEntries(data.map((p) => [p.id, p.animal ?? null])) }));
        }
      });
  }, [messages, names, supabase]);

  const firstScroll = useRef(true);
  useEffect(() => {
    if (firstScroll.current && newLine.current) newLine.current.scrollIntoView({ block: 'center' });
    else bottom.current?.scrollIntoView({ block: 'end' });
    firstScroll.current = false;
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

  async function toggleReaction(messageId: number, emoji: string) {
    setPicking(null);
    const r = { message_id: messageId, user_id: meId, emoji };
    if (reactions.some((x) => same(x, r))) {
      setReactions((l) => l.filter((x) => !same(x, r)));
      await supabase.from('message_reactions').delete().eq('message_id', messageId).eq('user_id', meId).eq('emoji', emoji);
    } else {
      setReactions((l) => [...l, r]);
      const { error } = await supabase.from('message_reactions').insert({ message_id: messageId, emoji });
      if (error) setReactions((l) => l.filter((x) => !same(x, r)));
    }
  }

  /** The emoji chips under a message, and the picker when it's open. */
  function reactionsFor(m: ChatMessage, align: 'left' | 'right') {
    const these = reactions.filter((r) => r.message_id === m.id);
    const counts = REACTIONS.map((e) => ({ e, who: these.filter((r) => r.emoji === e) })).filter((c) => c.who.length);
    if (!counts.length && picking !== m.id) return null;
    return (
      <div className={`reactions ${align}`}>
        {picking === m.id && (
          <div className="react-pick" role="group" aria-label="React">
            {REACTIONS.map((e) => (
              <button key={e} type="button" aria-pressed={these.some((r) => r.emoji === e && r.user_id === meId)} onClick={() => toggleReaction(m.id, e)}>
                {e}
              </button>
            ))}
          </div>
        )}
        {counts.map(({ e, who }) => (
          <button
            key={e}
            type="button"
            className={`react-chip ${who.some((r) => r.user_id === meId) ? 'mine' : ''}`}
            title={who.map((r) => (r.user_id === meId ? 'You' : firstName(names[r.user_id] ?? 'Member'))).join(', ')}
            aria-label={`${e} ${who.length}, ${who.some((r) => r.user_id === meId) ? 'including you. Tap to remove yours.' : 'tap to add yours.'}`}
            onClick={() => toggleReaction(m.id, e)}
          >
            {e} {who.length > 1 && <span>{who.length}</span>}
          </button>
        ))}
      </div>
    );
  }
  const openPicker = (id: number) => setPicking((p) => (p === id ? null : id));

  function row(m: ChatMessage, i: number) {
    if (m.kind === 'recap') {
      return (
        <div key={m.id} className="stack tight">
          <div className="card teal stack tight reactable" onClick={() => openPicker(m.id)}>
            <div className="eyebrow teal">Friday recap</div>
            <p className="pre">{m.body}</p>
          </div>
          {reactionsFor(m, 'left')}
        </div>
      );
    }
    const name = names[m.user_id ?? ''] ?? 'Member';
    const mine = m.user_id === meId;
    if (m.kind === 'milestone') {
      const n = parseInt(m.body, 10) || 0;
      return (
        <div key={m.id} className="stack tight">
        <div className="milestone-card reactable" title={timeAgo(m.created_at)} onClick={() => openPicker(m.id)}>
          {m.user_id && <PersonAvatar id={m.user_id} name={name} animal={animals[m.user_id]} />}
          <div className="grow">
            <div className="milestone-n">
              🎉 {n} classes
            </div>
            <div className="small">
              {mine ? 'You’ve' : `${firstName(name)} has`} shown up for {n} classes. {n >= 100 ? 'Legend.' : n >= 50 ? 'That’s a habit.' : 'Keep it rolling!'}
            </div>
          </div>
        </div>
        {reactionsFor(m, 'left')}
        </div>
      );
    }
    const showName = !mine && (i === 0 || messages[i - 1].user_id !== m.user_id || messages[i - 1].kind === 'pr');
    if (m.kind === 'pr' && m.lift_log_id) {
      const these = cheers.filter((c) => c.lift_log_id === m.lift_log_id);
      const cheered = these.some((c) => c.user_id === meId);
      return (
        <PrCard
          key={m.id}
          who={mine ? 'You' : firstName(name)}
          body={m.body}
          art={art[m.id]?.url}
          artTarget={art[m.id] ? { userId: art[m.id].userId, movementId: art[m.id].movementId } : undefined}
          canRedraw={isAdmin}
          cheerers={these.map((c) => ({ id: c.user_id, name: names[c.user_id] ?? 'Member', animal: animals[c.user_id] }))}
          cheer={<CheerPop count={these.length} cheered={cheered} disabled={mine} name={name} onToggle={() => toggleCheer(m.lift_log_id!)} />}
        />
      );
    }
    return (
      <div key={m.id} className="row top" style={{ justifyContent: mine ? 'flex-end' : 'flex-start' }}>
        {!mine && (
          showName && m.user_id ? (
            <PersonAvatar id={m.user_id} name={name} animal={animals[m.user_id]} />
          ) : (
            <Avatar id={m.user_id ?? ''} name={name} animal={animals[m.user_id ?? '']} size="sm" hidden />
          )
        )}
        <div className={`bubble-wrap ${mine ? 'mine' : ''}`}>
          <div className={`bubble reactable ${mine ? 'mine' : ''}`} title={timeAgo(m.created_at)} onClick={() => openPicker(m.id)}>
            {showName && <div className="who">{firstName(name)}</div>}
            {m.body}
          </div>
          {reactionsFor(m, mine ? 'right' : 'left')}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="stack" aria-live="polite">
        {messages.length === 0 && <p className="muted center">No messages yet. Say good morning!</p>}
        {messages.map((m, i) => (
          <Fragment key={m.id}>
            {m.id === firstNewId && (
              <div ref={newLine} className="chat-new" role="separator">
                New
              </div>
            )}
            {row(m, i)}
          </Fragment>
        ))}
        <div ref={bottom} />
      </div>
      <form onSubmit={send} className="row chat-form">
        <label htmlFor="msg" className="sr-only">
          Message
        </label>
        <textarea
          id="msg"
          ref={box}
          className="chat-input"
          placeholder="Message the crew…"
          value={text}
          rows={1}
          maxLength={2000}
          autoComplete="off"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // On a computer, Enter sends and Shift+Enter starts a new line.
            // On a phone, return makes a new line and the arrow button sends, like Messages.
            const phone = window.matchMedia('(pointer: coarse)').matches;
            if (!phone && e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <button className="btn primary" aria-label="Send" disabled={sending || !text.trim()} style={{ width: 52, padding: 0, borderRadius: 26, flex: 'none' }}>
          <Icon name="send" />
        </button>
      </form>
      {error && <p className="small" role="alert">{error}</p>}
    </>
  );
}

const same = (a: Reaction, b: Reaction) => a.message_id === b.message_id && a.user_id === b.user_id && a.emoji === b.emoji;
