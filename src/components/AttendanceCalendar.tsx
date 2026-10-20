'use client';
import { useState } from 'react';
import { addDays, shortDate } from '@/lib/dates';
import type { DayMark } from '@/lib/attendance';
import { Icon } from './Icon';

type Week = { monday: string; days: { date: string; mark: DayMark }[] };

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F'];
const day = (d: string) => shortDate(d).split(' · ')[1];

/** Your classes, 4 weeks at a time, newest first. Step back like a calendar app. */
export function AttendanceCalendar({ pages }: { pages: Week[][] }) {
  const [page, setPage] = useState(0);
  const weeks = pages[page];
  const first = weeks[0].monday;
  const last = addDays(weeks[weeks.length - 1].monday, 4);
  const made = weeks.flatMap((w) => w.days).filter((d) => d.mark === 'in').length;

  return (
    <section className="stack tight">
      <div className="row between">
        <div className="eyebrow">{page === 0 ? 'Last 4 weeks' : `${day(first)} – ${day(last)}`}</div>
        {pages.length > 1 && (
          <div className="att-nav">
            <button type="button" aria-label="Earlier 4 weeks" disabled={page === pages.length - 1} onClick={() => setPage((p) => p + 1)}>
              <span style={{ display: 'flex', transform: 'rotate(180deg)' }}>
                <Icon name="next" size={18} />
              </span>
            </button>
            <button type="button" aria-label="Later 4 weeks" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              <Icon name="next" size={18} />
            </button>
          </div>
        )}
      </div>
      <div className="card att-cal" role="img" aria-label={`You made ${made} classes from ${day(first)} to ${day(last)}`}>
        <div className="att-row att-head">
          {DAY_LETTERS.map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
        {weeks.map((w) => (
          <div key={w.monday} className="att-row">
            {w.days.map((d) => (
              <span key={d.date} className={`att-dot ${d.mark}`} title={d.date} />
            ))}
          </div>
        ))}
        <div className="att-key muted small">
          <span>
            <span className="att-dot in" /> You were in · {made}
          </span>
          <span>
            <span className="att-dot missed" /> Missed
          </span>
        </div>
      </div>
    </section>
  );
}
