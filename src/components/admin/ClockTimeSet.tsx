'use client';
import { useState, useTransition } from 'react';
import { setClockTime } from '@/app/actions';

/** Set the clock's time of day to Halifax time, through the hub. */
export function ClockTimeSet() {
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState('');
  function go(format: 12 | 24) {
    setMsg('Typing in the time, then pressing OK right on the next minute. This takes up to a minute and a half…');
    start(async () => {
      const r = await setClockTime(format);
      setMsg(r && 'error' in r && r.error ? r.error : r && 'set' in r ? `Set to ${r.set}. Does the clock show it?` : 'Done.');
    });
  }
  return (
    <div className="card stack tight">
      <p className="small muted" style={{ margin: 0 }}>
        Sets the clock to the time here (Atlantic). Start from the time of day showing, and don’t press anything until it’s done. If the clock shows 24-hour time (like 14:05), use 24-hour.
      </p>
      <div className="row" style={{ gap: 8 }}>
        <button type="button" className="btn primary grow" disabled={busy} onClick={() => go(12)}>
          Set time (12-hour)
        </button>
        <button type="button" className="btn ghost grow" disabled={busy} onClick={() => go(24)}>
          24-hour
        </button>
      </div>
      {msg && (
        <p className="small" role="status" style={{ margin: 0 }}>
          {msg}
        </p>
      )}
    </div>
  );
}
