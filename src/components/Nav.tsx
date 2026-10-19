'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { Icon } from './Icon';

const TABS = [
  { href: '/', label: 'Today', icon: 'home' },
  { href: '/workouts', label: 'Workouts', icon: 'calendar' },
  { href: '/lifts', label: 'My stats', icon: 'barbell' },
  { href: '/chat', label: 'Chat', icon: 'chat' },
];

export function Nav() {
  const path = usePathname();
  const supabase = useMemo(() => supabaseBrowser(), []);
  // A quiet dot on Chat when someone else has posted since you last looked.
  const [unread, setUnread] = useState(false);
  const inChat = path.startsWith('/chat');
  const wasInChat = useRef(inChat);

  useEffect(() => {
    const left = wasInChat.current && !inChat;
    wasInChat.current = inChat;
    // In the chat, or just out of it: you've seen everything.
    if (inChat || left) {
      setUnread(false);
      return;
    }
    let live = true;
    const check = () =>
      supabase.rpc('chat_unread').then(({ data }) => {
        if (live) setUnread(data === true);
      });
    check();
    const onShow = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onShow);
    return () => {
      live = false;
      document.removeEventListener('visibilitychange', onShow);
    };
  }, [inChat, supabase]);

  return (
    <nav className="nav" aria-label="Main">
      <div className="nav-inner">
        {TABS.map((t) => {
          const active = t.href === '/' ? path === '/' : path.startsWith(t.href);
          const dot = t.href === '/chat' && unread && !active;
          return (
            <Link key={t.href} href={t.href} aria-current={active ? 'page' : undefined}>
              <span className="nav-icon">
                <Icon name={t.icon} size={24} stroke={active ? 2.3 : 2} />
                {dot && <span className="nav-dot" aria-hidden="true" />}
              </span>
              {t.label}
              {dot && <span className="sr-only"> (new messages)</span>}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
