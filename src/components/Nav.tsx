'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from './Icon';

const TABS = [
  { href: '/', label: 'Today', icon: 'home' },
  { href: '/workouts', label: 'Workouts', icon: 'calendar' },
  { href: '/lifts', label: 'My stats', icon: 'barbell' },
  { href: '/chat', label: 'Chat', icon: 'chat' },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav className="nav" aria-label="Main">
      <div className="nav-inner">
        {TABS.map((t) => {
          const active = t.href === '/' ? path === '/' : path.startsWith(t.href);
          return (
            <Link key={t.href} href={t.href} aria-current={active ? 'page' : undefined}>
              <Icon name={t.icon} size={24} stroke={active ? 2.3 : 2} />
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
