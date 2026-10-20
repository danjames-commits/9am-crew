'use client';
import { useState } from 'react';
import { setAttendance } from '@/app/actions';
import { Avatar } from './Avatar';
import { PersonAvatar } from './PersonAvatar';

interface Person {
  id: string;
  name: string;
  animal?: string | null;
}

export function CheckIn({
  classDate,
  me,
  others,
  going,
  compact = false,
}: {
  classDate: string;
  me: Person;
  others: Person[];
  going: boolean;
  compact?: boolean;
}) {
  // Flips straight away and stays tappable while the save runs in the background.
  const [optimistic, setGoing] = useState(going);
  const [error, setError] = useState('');
  const crew = optimistic ? [...others, me] : others;

  async function toggle() {
    const next = !optimistic;
    setError('');
    setGoing(next);
    const r = await setAttendance(classDate, next);
    if (r?.error) {
      setGoing(!next);
      setError('Couldn’t save that. Try again.');
    }
  }

  if (compact) {
    const names = crew.map((p) => p.name).join(', ');
    return (
      <div className="row between" style={{ gap: 10 }}>
        <div className="grow small" title={names}>
          {optimistic ? <b>You’re in</b> : <b>Coming?</b>}
          <span className="muted"> · {crew.length} going</span>
        </div>
        {optimistic ? (
          <button className="btn small ghost" onClick={toggle}>
            Cancel
          </button>
        ) : (
          <button className="btn small primary" onClick={toggle}>
            I’m coming
          </button>
        )}
        {error && (
          <p className="small" role="alert" style={{ width: '100%' }}>
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="row between">
        <div className="avatars" aria-label={`${crew.length} going`}>
          {crew.map((p) =>
            p.id === me.id ? (
              <Avatar key={p.id} id={p.id} name={p.name} animal={p.animal} size="sm" />
            ) : (
              <PersonAvatar key={p.id} id={p.id} name={p.name} animal={p.animal} />
            ),
          )}
          {crew.length === 0 && <span className="muted">Nobody yet. Be the first!</span>}
        </div>
        <span className="muted">{crew.length} going</span>
      </div>
      {optimistic ? (
        <button className="btn outline-gold big" onClick={toggle}>
          You’re in · tap to cancel
        </button>
      ) : (
        <button className="btn primary big" onClick={toggle}>
          I’m coming
        </button>
      )}
      {error && <p className="small" role="alert">{error}</p>}
    </div>
  );
}
