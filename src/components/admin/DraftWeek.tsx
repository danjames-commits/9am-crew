'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { aiDraftDay } from '@/app/actions';
import { shortDate } from '@/lib/dates';

interface Week {
  label: string;
  days: { date: string; taken: boolean }[];
}

/** Has Claude draft every empty day of a week, one day at a time. */
export function DraftWeek({ weeks }: { weeks: Week[] }) {
  const router = useRouter();
  const [w, setW] = useState(weeks.findIndex((x) => x.days.some((d) => !d.taken)) >= 0 ? weeks.findIndex((x) => x.days.some((d) => !d.taken)) : 0);
  const [status, setStatus] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const week = weeks[w];
  const empty = week.days.filter((d) => !d.taken);

  async function go() {
    setBusy(true);
    for (const d of empty) {
      setStatus((s) => ({ ...s, [d.date]: 'Writing…' }));
      const r = await aiDraftDay(d.date);
      setStatus((s) => ({ ...s, [d.date]: r.error ? `Problem: ${r.error}` : r.skipped ? 'Already had one' : `Drafted: ${r.title}` }));
      if (r.error) break;
    }
    setBusy(false);
    router.refresh();
  }

  return (
    <section className="card stack" style={{ border: '2px solid var(--teal)' }} aria-labelledby="draft-week">
      <h2 id="draft-week">Draft a week with Claude</h2>
      <div className="segmented" role="group" aria-label="Which week" style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }}>
        {weeks.map((x, i) => (
          <button key={x.label} type="button" aria-pressed={w === i} onClick={() => setW(i)} disabled={busy}>
            {x.label}
          </button>
        ))}
      </div>
      <ul className="stack tight" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {week.days.map((d) => (
          <li key={d.date} className="row between small">
            <span>{shortDate(d.date)}</span>
            <span className="muted">{status[d.date] ?? (d.taken ? 'Already planned' : 'Empty')}</span>
          </li>
        ))}
      </ul>
      {empty.length ? (
        <button type="button" className="btn teal" disabled={busy} onClick={go}>
          {busy ? 'Claude is writing… about 20 seconds a day' : `Draft ${empty.length} empty day${empty.length > 1 ? 's' : ''}`}
        </button>
      ) : (
        <p className="muted small">Every day this week already has a workout.</p>
      )}
      <p className="muted small">They’re saved as drafts. Open each one to check it, tweak it, and publish.</p>
    </section>
  );
}
