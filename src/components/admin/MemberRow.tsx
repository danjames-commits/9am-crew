'use client';
import { useState, useTransition } from 'react';
import { setMember, removeMember } from '@/app/actions';
import { Avatar } from '../Avatar';
import { levelName } from '@/lib/types';

interface Member {
  id: string;
  display_name: string;
  level: number;
  is_admin: boolean;
  approved: boolean;
  animal?: string | null;
}

export function MemberRow({ m, isMe }: { m: Member; isMe: boolean }) {
  const [pending, run] = useTransition();
  const [error, setError] = useState('');
  const act = (fn: () => Promise<{ error?: string } | { ok: boolean } | undefined>) =>
    run(async () => {
      setError('');
      const r = await fn();
      if (r && 'error' in r && r.error) setError(r.error);
    });

  return (
    <div className="list-item" style={{ flexWrap: 'wrap' }}>
      <Avatar id={m.id} name={m.display_name} animal={m.animal} size="sm" />
      <div className="grow">
        <div style={{ fontWeight: 700 }}>
          {m.display_name}
          {isMe ? ' (you)' : ''} {m.is_admin && <span className="badge">ADMIN</span>}
        </div>
        <div className="muted small">{m.approved ? levelName(m.level) : 'Waiting for approval'}</div>
      </div>
      {!isMe && (
        <div className="row" style={{ gap: 6 }}>
          {!m.approved ? (
            <>
              <button className="btn small primary" disabled={pending} onClick={() => act(() => setMember(m.id, true, false))}>
                Approve
              </button>
              <button
                className="btn small danger"
                disabled={pending}
                onClick={() => confirm(`Turn away ${m.display_name}?`) && act(() => removeMember(m.id))}
              >
                Turn away
              </button>
            </>
          ) : (
            <>
              <button className="btn small ghost" disabled={pending} onClick={() => act(() => setMember(m.id, true, !m.is_admin))}>
                {m.is_admin ? 'Remove admin' : 'Make admin'}
              </button>
              <button
                className="btn small danger"
                disabled={pending}
                onClick={() => confirm(`Remove ${m.display_name} from the crew? Their lifts and messages are deleted too.`) && act(() => removeMember(m.id))}
              >
                Remove
              </button>
            </>
          )}
        </div>
      )}
      {error && (
        <p className="small" role="alert" style={{ width: '100%' }}>
          {error}
        </p>
      )}
    </div>
  );
}
