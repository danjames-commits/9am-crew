'use client';
import { useOptimistic, useTransition, useState } from 'react';
import { setAttendance } from '@/app/actions';
import { avatarColor, initials } from '@/lib/ui';

interface Person {
  id: string;
  name: string;
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
  const [pending, start] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(going);
  const [error, setError] = useState('');
  const crew = optimistic ? [...others, me] : others;

  function toggle() {
    setError('');
    start(async () => {
      setOptimistic(!optimistic);
      const r = await setAttendance(classDate, !optimistic);
      if (r?.error) setError('Couldn’t save that. Try again.');
    });
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
          <button className="btn small ghost" onClick={toggle} disabled={pending}>
            Cancel
          </button>
        ) : (
          <button className="btn small primary" onClick={toggle} disabled={pending}>
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
          {crew.map((p) => (
            <span key={p.id} className="avatar sm" style={{ background: avatarColor(p.id) }} title={p.name}>
              {initials(p.name)}
            </span>
          ))}
          {crew.length === 0 && <span className="muted">Nobody yet. Be the first!</span>}
        </div>
        <span className="muted">{crew.length} going</span>
      </div>
      {optimistic ? (
        <button className="btn outline-gold big" onClick={toggle} disabled={pending}>
          You’re in · tap to cancel
        </button>
      ) : (
        <button className="btn primary big" onClick={toggle} disabled={pending}>
          I’m coming
        </button>
      )}
      {crew.length > 0 && (
        <p className="muted small">{crew.map((p) => p.name).join(', ')}</p>
      )}
      {error && <p className="small" role="alert">{error}</p>}
    </div>
  );
}
