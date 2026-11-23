'use client';
import { Linkify } from './Linkify';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { firstName } from '@/lib/ui';
import { Avatar } from './Avatar';
import { PersonAvatar } from './PersonAvatar';
import { timeAgo } from '@/lib/dates';
import { Icon } from './Icon';
import { PrCard } from './PrCard';
import { CheerPop } from './CheerPop';
import { ReactionMenu } from './ReactionMenu';
import { pillLabel, same, summarize, type Reaction } from '@/lib/reactions';
import { haptic } from '@/lib/haptics';
import { useMessagePress } from '@/lib/useMessagePress';

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
export { REACTIONS, type Reaction } from '@/lib/reactions';

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
  // The message whose reaction menu is open (hold a message, or tap its reactions).
  const [menuFor, setMenuFor] = useState<number | null>(null);
  const openMenu = useCallback((id: number) => setMenuFor(id), []);
  const closeMenu = useCallback(() => setMenuFor(null), []);
  // The pill that just got a new reaction pops once; n restarts the animation.
  const [pop, setPop] = useState<{ id: number; n: number } | null>(null);
  const bump = (id: number) => setPop({ id, n: Date.now() });
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
        if (r.user_id !== meId) setPop({ id: r.message_id, n: Date.now() });
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'message_reactions' }, (p) => {
        const r = p.old as Reaction;
        setReactions((list) => list.filter((x) => !same(x, r)));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, meId]);

  // If the message is deleted while its menu is open, close the menu.
  useEffect(() => {
    if (menuFor != null && !messages.some((m) => m.id === menuFor)) setMenuFor(null);
  }, [messages, menuFor]);

  // Look up names of anyone new, including people who reacted but never posted.
  useEffect(() => {
    const ids = [...messages.map((m) => m.user_id), ...reactions.map((r) => r.user_id)];
    const missing = [...new Set(ids)].filter((id): id is string => !!id && !(id in names));
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
  }, [messages, reactions, names, supabase]);
  const people = useMemo(
    () => Object.fromEntries(Object.keys(names).map((id) => [id, { name: names[id], animal: animals[id] }])),
    [names, animals],
  );

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
    haptic();
    const r = { message_id: messageId, user_id: meId, emoji };
    if (reactions.some((x) => same(x, r))) {
      setReactions((l) => l.filter((x) => !same(x, r)));
      const { error } = await supabase.from('message_reactions').delete().eq('message_id', messageId).eq('user_id', meId).eq('emoji', emoji);
      if (error) setReactions((l) => (l.some((x) => same(x, r)) ? l : [...l, r]));
    } else {
      setReactions((l) => [...l, r]);
      bump(messageId);
      const { error } = await supabase.from('message_reactions').insert({ message_id: messageId, emoji });
      if (error) setReactions((l) => l.filter((x) => !same(x, r)));
    }
  }

  /** Double-tap: add a ❤️ (never removes it, like Instagram). */
  function doubleTapHeart(messageId: number) {
    if (reactions.some((r) => r.message_id === messageId && r.user_id === meId && r.emoji === '❤️')) return;
    toggleReaction(messageId, '❤️');
  }

  const press = useMessagePress({ onHold: openMenu, onDoubleTap: doubleTapHeart });
  /**
   * Gesture props for a message you can react to. No button role, aria-label or tab stop on the
   * message itself: that would hide its text from screen readers and nest links inside a button.
   * Keyboard and screen-reader users get the explicit "React to ..." button instead (reactBtn).
   */
  const pressProps = (m: ChatMessage) => ({ ...press, 'data-id': m.id });

  /** A visually hidden button (visible on keyboard focus) that opens the reaction menu. */
  function reactBtn(m: ChatMessage, label: string) {
    return (
      <button type="button" className="react-sr" data-react-for={m.id} onClick={() => openMenu(m.id)}>
        React to {label}
      </button>
    );
  }

  /** The reactions pill on a message's bottom corner. */
  function pillFor(m: ChatMessage, align: 'left' | 'right') {
    const these = reactions.filter((r) => r.message_id === m.id);
    if (!these.length) return null;
    const s = summarize(these, meId);
    const popN = pop?.id === m.id ? pop.n : null;
    return (
      <button
        key={popN ?? 'pill'}
        type="button"
        className={`react-pill ${align} ${s.mine ? 'mine' : ''} ${popN ? 'pop' : ''}`}
        aria-label={pillLabel(s)}
        onClick={() => openMenu(m.id)}
      >
        {s.top.join('')}
        {s.total > 1 && <span>{s.total}</span>}
      </button>
    );
  }
  const hostClass = (m: ChatMessage) => (reactions.some((r) => r.message_id === m.id) ? 'react-host has-pill' : 'react-host');

  /** What the menu shows of the message. */
  function previewOf(m: ChatMessage) {
    const text = m.kind === 'milestone' ? `🎉 ${parseInt(m.body, 10) || 0} classes` : m.body;
    const mine = m.kind === 'text' && m.user_id === meId;
    return (
      <div className={`bubble react-menu-msg ${mine ? 'mine' : ''}`}>
        <p className="pre">{text}</p>
      </div>
    );
  }

  function row(m: ChatMessage, i: number) {
    if (m.kind === 'recap') {
      return (
        <div key={m.id} className={`stack tight ${hostClass(m)}`}>
          <div className="card teal stack tight reactable" {...pressProps(m)}>
            <div className="eyebrow teal">Friday recap</div>
            <p className="pre">{m.body}</p>
          </div>
          {pillFor(m, 'left')}
          {reactBtn(m, 'this recap')}
        </div>
      );
    }
    const name = names[m.user_id ?? ''] ?? 'Member';
    const mine = m.user_id === meId;
    if (m.kind === 'milestone') {
      const n = parseInt(m.body, 10) || 0;
      return (
        <div key={m.id} className={`stack tight ${hostClass(m)}`}>
          <div className="milestone-card reactable" title={timeAgo(m.created_at)} {...pressProps(m)}>
            {m.user_id && <PersonAvatar id={m.user_id} name={name} animal={animals[m.user_id]} />}
            <div className="grow">
              <div className="milestone-n">🎉 {n} classes</div>
              <div className="small">
                {mine ? 'You’ve' : `${firstName(name)} has`} shown up for {n} classes. {n >= 100 ? 'Legend.' : n >= 50 ? 'That’s a habit.' : 'Keep it rolling!'}
              </div>
            </div>
          </div>
          {pillFor(m, 'left')}
          {reactBtn(m, mine ? 'your milestone' : `${firstName(name)}’s milestone`)}
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
        <div className={`bubble-wrap ${mine ? 'mine' : ''} ${hostClass(m)}`}>
          <div className={`bubble reactable ${mine ? 'mine' : ''}`} title={timeAgo(m.created_at)} {...pressProps(m)}>
            {showName && <div className="who">{firstName(name)}</div>}
            <Linkify text={m.body} />
          </div>
          {pillFor(m, mine ? 'right' : 'left')}
          {reactBtn(m, mine ? 'your message' : `${firstName(name)}’s message`)}
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
        <button
          className="btn primary"
          aria-label="Send"
          disabled={sending || !text.trim()}
          style={{ width: 52, padding: 0, borderRadius: 26, flex: 'none' }}
          // Keep the cursor in the box: otherwise the first tap closes the keyboard, the bar
          // moves down, and the tap misses Send (Dan, Nov 3). The keyboard stays up, like Messages.
          onPointerDown={(e) => e.preventDefault()}
          onMouseDown={(e) => e.preventDefault()}
        >
          <Icon name="send" />
        </button>
      </form>
      {error && <p className="small" role="alert">{error}</p>}
      {menuFor != null &&
        (() => {
          const m = messages.find((x) => x.id === menuFor);
          return m ? (
            <ReactionMenu
              messageId={m.id}
              preview={previewOf(m)}
              reactions={reactions.filter((r) => r.message_id === m.id)}
              meId={meId}
              people={people}
              onToggle={(e) => toggleReaction(m.id, e)}
              onClose={closeMenu}
            />
          ) : null;
        })()}
    </>
  );
}
