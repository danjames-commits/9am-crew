import { firstName } from '@/lib/ui';
import { bestWeekStreak, leaderboard, recentWeeks, weekStreak, type AttendanceRow } from '@/lib/attendance';
import { LiftsTabs } from './LiftsTabs';
import { Avatar } from './Avatar';

const MEDALS = ['🥇', '🥈', '🥉'];
const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F'];
const listNames = (n: string[]) => (n.length < 2 ? n.join('') : `${n.slice(0, -1).join(', ')} and ${n[n.length - 1]}`);

export function AttendanceView({ userId, today, names, animals, rows, held }: {
  userId: string;
  today: string;
  names: Record<string, string>;
  animals: Record<string, string | null>;
  rows: AttendanceRow[];
  held: string[];
}) {
  const mine = rows.filter((r) => r.user_id === userId).map((r) => r.class_date);
  const monthStart = today.slice(0, 8) + '01';
  const monthName = new Date(today + 'T12:00:00Z').toLocaleDateString('en-CA', { month: 'long', timeZone: 'UTC' });

  const thisMonth = mine.filter((d) => d >= monthStart).length;
  const streak = weekStreak(mine, today);
  const best = bestWeekStreak(mine);
  const weeks = recentWeeks(new Set(mine), new Set(held), today);

  const board = leaderboard(rows, monthStart, today);
  const crewTotal = board.reduce((n, r) => n + r.count, 0);
  // Who has the longest streak going right now.
  const streaks = Object.keys(names)
    .map((id) => ({ id, n: weekStreak(rows.filter((r) => r.user_id === id).map((r) => r.class_date), today) }))
    .sort((a, b) => b.n - a.n);
  const hot = streaks[0]?.n >= 2 ? streaks.filter((s) => s.n === streaks[0].n) : [];

  return (
    <main className="screen">
      <h1>My stats</h1>
      <LiftsTabs current="attendance" />

      <section className="card dark stack">
        <div className="att-stats">
          <div>
            <div className="att-big">{thisMonth}</div>
            <div className="muted small">in {monthName}</div>
          </div>
          <div>
            <div className="att-big">
              {streak}
              {streak >= 2 && <span aria-hidden="true"> 🔥</span>}
            </div>
            <div className="muted small">{streak === 1 ? 'week' : 'weeks'} in a row</div>
          </div>
          <div>
            <div className="att-big">{mine.length}</div>
            <div className="muted small">all time</div>
          </div>
        </div>
        <p className="small" style={{ color: 'var(--gold)' }}>
          {streak === 0
            ? 'Make one class this week to start a streak.'
            : streak >= best && streak >= 2
              ? 'Your longest streak yet. Keep it going!'
              : `Best streak: ${best} ${best === 1 ? 'week' : 'weeks'}. One class a week keeps it alive.`}
        </p>
      </section>

      <section className="stack tight">
        <div className="eyebrow">Last 8 weeks</div>
        <div className="card att-cal" role="img" aria-label={`You made ${weeks.flatMap((w) => w.days).filter((d) => d.mark === 'in').length} classes in the last 8 weeks`}>
          <div className="att-row att-head">
            {DAY_LETTERS.map((l, i) => (
              <span key={i}>{l}</span>
            ))}
          </div>
          {weeks.map((w) => (
            <div key={w.monday} className="att-row">
              {w.days.map((d) => (
                <span key={d.date} className={`att-dot ${d.mark} ${d.date === today ? 'today' : ''}`} title={d.date} />
              ))}
            </div>
          ))}
          <div className="att-key muted small">
            <span>
              <span className="att-dot in" /> You were in
            </span>
            <span>
              <span className="att-dot missed" /> Missed
            </span>
          </div>
        </div>
      </section>

      <section className="stack tight">
        <div className="row between">
          <div className="eyebrow">{monthName} leaderboard</div>
          {crewTotal > 0 && <span className="muted small">{crewTotal} classes as a crew</span>}
        </div>
        {hot.length > 0 && (
          <p className="small">
            <span aria-hidden="true">🔥 </span>
            <b>{listNames(hot.map((h) => (h.id === userId ? 'You' : firstName(names[h.id]))))}</b>{' '}
            {hot.length === 1 && hot[0].id !== userId ? 'has' : 'have'} the longest streak going: {hot[0].n} weeks.
          </p>
        )}
        {board.length === 0 ? (
          <p className="muted">Nobody yet this month. First class gets the top spot.</p>
        ) : (
          <div className="card flush list">
            {board.map((r) => (
              <div key={r.user_id} className={`list-item ${r.user_id === userId ? 'att-me' : ''}`}>
                <span className={`att-rank ${r.rank <= 3 ? 'medal' : ''}`}>{r.rank <= 3 ? MEDALS[r.rank - 1] : r.rank}</span>
                <Avatar id={r.user_id} name={names[r.user_id]} animal={animals[r.user_id]} size="sm" />
                <span className="grow">
                  <b>{r.user_id === userId ? 'You' : names[r.user_id]}</b>
                </span>
                <span className="att-bar" aria-hidden="true">
                  <span style={{ width: `${(r.count / board[0].count) * 100}%` }} />
                </span>
                <b className="att-count">{r.count}</b>
              </div>
            ))}
          </div>
        )}
        <p className="muted small">Counts the classes you tapped “I’m in” for. Starts fresh every month.</p>
      </section>
    </main>
  );
}
