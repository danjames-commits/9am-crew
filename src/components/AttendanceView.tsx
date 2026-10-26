import { firstName } from '@/lib/ui';
import { addDays, mondayOf } from '@/lib/dates';
import { bestGoalStreak, goalBoard, goalStreak, recentWeeks, weekCounts, type AttendanceRow } from '@/lib/attendance';
import { LiftsTabs } from './LiftsTabs';
import { Avatar } from './Avatar';
import { PersonAvatar } from './PersonAvatar';
import { GoalPicker } from './GoalPicker';
import { AttendanceCalendar } from './AttendanceCalendar';

const MEDALS = ['🥇', '🥈', '🥉'];
const listNames = (n: string[]) => (n.length < 2 ? n.join('') : `${n.slice(0, -1).join(', ')} and ${n[n.length - 1]}`);
const weeksWord = (n: number) => (n === 1 ? 'week' : 'weeks');

export function AttendanceView({
  userId,
  doneThrough,
  names,
  animals,
  goals,
  hidden = [],
  rows,
  held,
}: {
  userId: string;
  /** The last day whose class is over. Nothing after it counts. */
  doneThrough: string;
  names: Record<string, string>;
  animals: Record<string, string | null>;
  goals: Record<string, number>;
  /** Opted out of the leaderboard. */
  hidden?: string[];
  /** Classes people were in, on days a workout actually ran, up to doneThrough. */
  rows: AttendanceRow[];
  held: string[];
}) {
  const goalSet = goals[userId] != null;
  // Until you pick one, your own numbers count against 1 a week; you're not on the board yet.
  const goal = goals[userId] ?? 1;
  const mine = rows.filter((r) => r.user_id === userId).map((r) => r.class_date);
  const thisWeek = weekCounts(mine).get(mondayOf(doneThrough)) ?? 0;
  const streak = goalStreak(mine, goal, doneThrough);
  const best = bestGoalStreak(mine, goal);
  // Up to 3 pages of 4 weeks, newest first; older pages only once there's something in them.
  const all = recentWeeks(new Set(mine), new Set(held), doneThrough, 12);
  const earliest = [...held, ...mine].sort()[0];
  const pages = [all.slice(8, 12), all.slice(4, 8), all.slice(0, 4)].filter(
    (p, i) => i === 0 || (earliest !== undefined && addDays(p[p.length - 1].monday, 4) >= earliest),
  );

  const monthStart = doneThrough.slice(0, 8) + '01';
  const monthName = new Date(doneThrough + 'T12:00:00Z').toLocaleDateString('en-CA', { month: 'long', timeZone: 'UTC' });
  const meHidden = hidden.includes(userId);
  const board = goalBoard(rows.filter((r) => !hidden.includes(r.user_id)), goals, monthStart, doneThrough);
  const crewTotal = board.reduce((n, r) => n + r.classes, 0);
  const top = board.length ? Math.max(...board.map((r) => r.streak)) : 0;
  // You first, then everyone else.
  const hot = top >= 2 ? board.filter((r) => r.streak === top).sort((a, b) => (b.user_id === userId ? 1 : 0) - (a.user_id === userId ? 1 : 0)) : [];

  return (
    <main className="screen">
      <h1>My stats</h1>
      <LiftsTabs current="attendance" />

      <section className="card dark stack">
        <div className="att-stats">
          <div>
            <div className="att-big">
              {Math.min(thisWeek, goal)}/{goal}
              {thisWeek >= goal && <span aria-hidden="true"> ✓</span>}
            </div>
            <div className="muted small">this week</div>
          </div>
          <div>
            <div className="att-big">
              {streak}
              {streak >= 2 && <span aria-hidden="true"> 🔥</span>}
            </div>
            <div className="muted small">{weeksWord(streak)} in a row</div>
          </div>
          <div>
            <div className="att-big">{mine.length}</div>
            <div className="muted small">classes all time</div>
          </div>
        </div>
        <p className="small" style={{ color: 'var(--gold)' }}>
          {!goalSet
            ? 'Pick a weekly goal below to start your streak and join the board.'
            : thisWeek >= goal
            ? streak >= 2 && streak >= best
              ? 'Goal hit, and your longest streak yet!'
              : 'Goal hit this week. Nice work.'
            : `${goal - thisWeek} more this week to hit your goal${streak > 0 ? ` and make it ${streak + 1} ${weeksWord(streak + 1)} in a row` : ''}.`}
        </p>
        <GoalPicker goal={goalSet ? goal : null} />
      </section>

      <AttendanceCalendar pages={pages} />

      <section className="stack tight">
        <div className="row between">
          <div className="eyebrow">{monthName} leaderboard</div>
          {crewTotal > 0 && <span className="muted small">{crewTotal} classes as a crew</span>}
        </div>
        <p className="muted small">Ranked by weeks each person hit their own goal. One mark per week: ✓ hit, grey missed, outline still going.</p>
        {hot.length > 0 && (
          <p className="small">
            <span aria-hidden="true">🔥 </span>
            <b>{listNames(hot.map((h) => (h.user_id === userId ? 'You' : firstName(names[h.user_id]))))}</b>{' '}
            {hot.length === 1 && hot[0].user_id !== userId ? 'has' : 'have'} the longest goal streak going: {top} weeks.
          </p>
        )}
        {board.length === 0 ? (
          <p className="muted">No classes yet this month. First one gets you on the board.</p>
        ) : (
          <div className="card flush list">
            {board.map((r) => (
              <div key={r.user_id} className={`list-item ${r.user_id === userId ? 'att-me' : ''}`}>
                <span className={`att-rank ${r.rank <= 3 && r.hits > 0 ? 'medal' : ''}`}>{r.rank <= 3 && r.hits > 0 ? MEDALS[r.rank - 1] : r.rank}</span>
                {r.user_id === userId ? (
                  <Avatar id={r.user_id} name={names[r.user_id]} animal={animals[r.user_id]} size="sm" />
                ) : (
                  <PersonAvatar id={r.user_id} name={names[r.user_id]} animal={animals[r.user_id]} />
                )}
                <span className="grow" style={{ minWidth: 0 }}>
                  <b>{r.user_id === userId ? 'You' : names[r.user_id]}</b>
                  <span className="muted small att-sub">
                    {r.goal}× a week{r.streak >= 2 ? ` · 🔥 ${r.streak}` : ''}
                  </span>
                </span>
                <span className="att-weeks" aria-label={`Hit goal ${r.hits} ${weeksWord(r.hits)} this month`}>
                  {r.weeks.map((w, i) => (
                    <span key={i} className={`att-wk ${w}`} title={w === 'hit' ? 'Hit goal' : w === 'missed' ? 'Missed goal' : 'This week, still going'}>
                      {w === 'hit' ? '✓' : ''}
                    </span>
                  ))}
                </span>
              </div>
            ))}
          </div>
        )}
        {meHidden && <p className="small">You’re hidden from the leaderboard. Your own numbers above are still yours. Change it on your Me page.</p>}
        <p className="muted small">Counts classes that have happened, when you tapped “I’m in”. Starts fresh every month.</p>
      </section>
    </main>
  );
}
