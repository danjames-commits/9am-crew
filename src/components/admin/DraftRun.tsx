'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { aiDraftDay } from '@/app/actions';
import { shortDate } from '@/lib/dates';

/** Has Claude draft a list of empty days one at a time, with progress and a Stop button. */
export function useDraftRun() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState<string | null>(null);
  const [error, setError] = useState('');
  const stop = useRef(false);

  async function run(dates: string[]) {
    if (!dates.length) return;
    stop.current = false;
    setRunning(true);
    setError('');
    setDone(0);
    setTotal(dates.length);
    let made = 0;
    for (const d of dates) {
      if (stop.current) break;
      setCurrent(d);
      const r = await aiDraftDay(d);
      if (r.error) {
        setError(`${shortDate(d)}: ${r.error}`);
        break;
      }
      made++;
      setDone(made);
    }
    setCurrent(null);
    setRunning(false);
    router.refresh();
  }

  return { run, running, done, total, current, error, stop: () => (stop.current = true) };
}

/** Quietly drafts the empty days coming up in the next week, once per visit. */
export function AutoDraft({ dates }: { dates: string[] }) {
  const { run, running, done, total, current, error } = useDraftRun();
  const started = useRef(false);
  useEffect(() => {
    if (started.current || !dates.length) return;
    started.current = true;
    run(dates);
    // Only on first load; later refreshes pass a shorter list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!running && !error) return null;
  return (
    <div className={`notice ${error ? 'bad' : 'good'}`} role="status">
      {running && current ? (
        <>
          Claude is drafting {shortDate(current)} ({done + 1} of {total}). They’ll be saved as drafts for you to check.
        </>
      ) : (
        <>Couldn’t draft {error}</>
      )}
    </div>
  );
}

/** "Draft the whole cycle" on the planner. */
export function DraftCycle({ dates, label }: { dates: string[]; label: string }) {
  const { run, running, done, total, current, error, stop } = useDraftRun();
  return (
    <section className="card stack" style={{ border: '2px solid var(--teal)' }} aria-labelledby="draft-cycle">
      <h2 id="draft-cycle" style={{ fontSize: 18 }}>
        Draft {label} with Claude
      </h2>
      {dates.length ? (
        <>
          <p className="muted small">
            {dates.length} empty day{dates.length > 1 ? 's' : ''} from {shortDate(dates[0])} to {shortDate(dates[dates.length - 1])}. About 20 seconds each; keep
            this page open. They’re saved as drafts for you to check and publish. Claude also drafts each coming week on its own when an admin opens
            the Program page.
          </p>
          {running ? (
            <>
              <div className="notice good" role="status">
                Drafting {current ? shortDate(current) : ''} ({Math.min(done + 1, total)} of {total})…
              </div>
              <button type="button" className="btn ghost" onClick={stop}>
                Stop after this day
              </button>
            </>
          ) : (
            <button type="button" className="btn teal" onClick={() => run(dates)}>
              Draft {dates.length} day{dates.length > 1 ? 's' : ''}
            </button>
          )}
        </>
      ) : (
        <p className="muted small">Every day left in this cycle already has a workout.</p>
      )}
      {!running && done > 0 && !error && <div className="notice good">Drafted {done} day{done > 1 ? 's' : ''}.</div>}
      {error && <div className="notice bad" role="alert">Stopped. {error}</div>}
    </section>
  );
}
