import Link from 'next/link';
import { shortDate } from '@/lib/dates';
import type { Part } from '@/lib/types';

export interface DigestDay {
  date: string;
  workout: { title: string; focus: string; status: string; parts: Part[] } | null;
}

/** Short tags for a day: the lift, any benchmark, the conditioning. */
export function dayTags(parts: Part[]) {
  const tags: { text: string; kind: 'lift' | 'test' | 'bench' | 'cond' | 'easy' }[] = [];
  for (const p of parts) {
    if (p.kind === 'strength' && p.lift) {
      const test = p.lift.mode === 'build';
      tags.push({ text: test ? `${p.lift.movement} test` : `${p.lift.movement}${p.lift.sets && p.lift.reps ? ` ${p.lift.sets}×${p.lift.reps}` : ''}`, kind: test ? 'test' : 'lift' });
    } else if (p.kind === 'strength' && p.title) tags.push({ text: p.title, kind: 'lift' });
  }
  for (const p of parts) if (p.benchmark) tags.push({ text: p.benchmark, kind: 'bench' });
  const cond = parts.find((p) => p.kind === 'conditioning' && !p.benchmark);
  if (cond?.title) tags.push({ text: cond.title, kind: /easy|flush|walk|mobility/i.test(cond.title + cond.label) ? 'easy' : 'cond' });
  return tags.slice(0, 3);
}

/** A week at a glance: one line per day, with what kind of day it is. */
export function WeekDigest({ days, today, isAdmin, heading, sub }: { days: DigestDay[]; today: string; isAdmin: boolean; heading: string; sub?: string }) {
  const tests = days.filter((d) => d.workout?.parts.some((p) => p.benchmark || p.lift?.mode === 'build')).length;
  return (
    <div className="stack tight">
      {heading && (
        <div className="row between">
          <div className="eyebrow">{heading}</div>
          {sub && <span className="muted small">{sub}</span>}
        </div>
      )}
      <div className="card flush list digest">
        {days.map(({ date, workout: w }) => {
          const posted = w && (w.status === 'published' || isAdmin);
          const isToday = date === today;
          const inner = (
            <>
              <div className={`digest-day ${isToday ? 'today' : ''}`}>
                <span>{shortDate(date).split(' · ')[0]}</span>
                <b>{shortDate(date).split(' ').pop()}</b>
              </div>
              <div className="grow" style={{ minWidth: 0 }}>
                {posted ? (
                  <>
                    <div className="digest-title">
                      {w!.title}
                      {w!.status === 'draft' ? <span className="muted small"> · draft</span> : null}
                    </div>
                    <div className="digest-tags">
                      {dayTags(w!.parts).map((t, k) => (
                        <span key={k} className={`tag ${t.kind}`}>
                          {t.kind === 'bench' ? '★ ' : ''}
                          {t.text}
                        </span>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="muted">Not posted yet</div>
                )}
              </div>
            </>
          );
          const href = posted ? `/workouts/${date}` : isAdmin ? `/admin/build/${date}` : null;
          return href ? (
            <Link key={date} href={href} className={`list-item ${isToday ? 'is-today' : ''}`}>
              {inner}
            </Link>
          ) : (
            <div key={date} className="list-item">
              {inner}
            </div>
          );
        })}
      </div>
      {tests > 0 && <p className="muted small">★ marks a benchmark: log your result on the workout.</p>}
    </div>
  );
}
