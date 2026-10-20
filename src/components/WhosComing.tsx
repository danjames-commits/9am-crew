'use client';
import { useEffect, useRef, useState } from 'react';
import { setAttendance } from '@/app/actions';
import { Avatar } from './Avatar';
import { PersonAvatar } from './PersonAvatar';

interface Person {
  id: string;
  name: string;
  animal?: string | null;
}

const SHOW = 4;

/**
 * Who's coming, as a little row of avatars. Not coming yet: an "I'm coming" pill.
 * Coming: your avatar leads with a gold ring; hover shows ✕, tap opens "Can't make it".
 */
export function WhosComing({ classDate, me, others, going }: { classDate: string; me: Person; others: Person[]; going: boolean }) {
  const [isGoing, setGoing] = useState(going);
  const [menu, setMenu] = useState(false);
  const [error, setError] = useState('');
  const box = useRef<HTMLDivElement>(null);
  const crew = isGoing ? [me, ...others] : others;
  const shown = crew.slice(0, SHOW);
  const extra = crew.length - shown.length;
  const names = crew.map((p) => p.name).join(', ');

  // Close the bubble when tapping anywhere else.
  useEffect(() => {
    if (!menu) return;
    const close = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setMenu(false);
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [menu]);

  async function set(next: boolean) {
    setError('');
    setMenu(false);
    setGoing(next);
    const r = await setAttendance(classDate, next);
    if (r?.error) {
      setGoing(!next);
      setError('Couldn’t save. Try again.');
    }
  }

  return (
    <div className="whos-coming" ref={box}>
      {!isGoing && (
        <button type="button" className="btn small primary coming-btn" onClick={() => set(true)} aria-label="I’m coming">
          {crew.length === 0 ? 'Be first in' : 'I’m in'}
        </button>
      )}
      {crew.length > 0 && (
        <div className="who-stack" aria-label={`${crew.length} going: ${names}`}>
          {shown.map((p) =>
            p.id === me.id ? (
              <button
                key={p.id}
                type="button"
                className="who-me"
                aria-label="You’re going. Tap if you can’t make it."
                aria-expanded={menu}
                onClick={() => setMenu((m) => !m)}
              >
                <Avatar id={p.id} name={p.name} animal={p.animal} size="sm" ring="var(--gold)" />
                <span className="who-x" aria-hidden="true">
                  ✕
                </span>
              </button>
            ) : (
              <span key={p.id} className="who-other">
                <PersonAvatar id={p.id} name={p.name} animal={p.animal} />
              </span>
            ),
          )}
          {extra > 0 && <span className="who-more">+{extra}</span>}
        </div>
      )}
      {menu && (
        <div className="who-bubble" role="dialog" aria-label="Your spot">
          <div className="small">
            <b>You’re in.</b> {crew.length > 1 ? `${crew.length} going.` : 'First one!'}
          </div>
          <button type="button" className="btn small danger" onClick={() => set(false)}>
            Can’t make it
          </button>
        </div>
      )}
      {error && (
        <div className="who-bubble small" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
