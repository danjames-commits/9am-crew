# Past Workouts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let members browse workouts that already ran, see which ones they attended, and see what they logged on a past day, without cluttering the daily screens.

**Architecture:** A new pure module (`src/lib/past-workouts.ts`) handles paging windows, week grouping and per-day result filtering, and it's unit-tested. A new server-rendered route `/workouts/past` reuses `WeekDigest` (with a new optional `attended` prop) and pages with a plain `?before=<monday>` link. Past workout pages get a server-rendered `YourDay` card in the existing `meta` slot, and Show-ups calendar dots become links.

**Tech Stack:** Next.js App Router (server components), Supabase JS client, TypeScript, Vitest, plain CSS in `src/app/globals.css`.

**Spec:** `docs/superpowers/specs/2026-11-22-past-workouts-design.md`

## Global Constraints

- No schema changes and no new migrations.
- Published workouts only on `/workouts/past`, admins included. Filter `status = 'published'`.
- The past cutoff is `lastClassDone()` from `src/lib/dates.ts`. Don't use `todayLocal()` for this.
- Dates are plain `'YYYY-MM-DD'` strings. Use the helpers in `src/lib/dates.ts` (`addDays`, `mondayOf`, `shortDate`). Never use `new Date()` math.
- 4 weeks per page.
- Only one change to a shared component's API: `WeekDigest` gets an optional `attended?: string[]`. `/workouts` doesn't pass it.
- Copy, exactly: link "Past workouts →", button "Show earlier", empty state "No past workouts yet.", card lines "You were in" / "You weren't in this one", screen-reader text "you were in".
- Colours come from existing CSS variables only, and must work in light and dark (`:root[data-dark]`).
- Every route gets a `loading.tsx`.
- Run tests with `npm test` (vitest). Type-check with `npx tsc --noEmit`.
- Commits end with the line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## File Map

| File | Status | Responsibility |
|---|---|---|
| `src/lib/past-workouts.ts` | create | Pure helpers: `pastWindow`, `groupByWeek`, `liftsOn`, `benchOn` |
| `src/lib/past-workouts.test.ts` | create | Vitest for the above |
| `src/components/WeekDigest.tsx` | modify | Optional `attended` prop showing a ✓ |
| `src/app/(app)/workouts/past/page.tsx` | create | The archive page |
| `src/app/(app)/workouts/past/loading.tsx` | create | Skeleton |
| `src/app/(app)/workouts/page.tsx` | modify | "Past workouts →" link |
| `src/components/YourDay.tsx` | create | "Your day" card |
| `src/app/(app)/workouts/[date]/page.tsx` | modify | Render `YourDay` on past days, plus the back-link target |
| `src/components/AttendanceCalendar.tsx` | modify | Dots become links, plus accessibility |
| `src/app/globals.css` | modify | `.digest-in`, `.past-link`, `.your-day`, `a.att-dot` focus |

---

### Task 1: Pure helpers in `src/lib/past-workouts.ts`

**Files:**
- Create: `src/lib/past-workouts.ts`
- Test: `src/lib/past-workouts.test.ts`

**Interfaces:**
- Consumes: `addDays`, `mondayOf` from `@/lib/dates`, and the type `BenchResult` from `@/lib/benchmarks`.
- Produces:
  - `pastWindow(opts: { before?: string | null; lastDone: string; earliest: string | null; weeks?: number }): { mondays: string[]; from: string | null; to: string | null; earlier: string | null }`. `mondays` is newest first. `from`/`to` is the date range to query (`null` when empty). `earlier` is the value for the next page's `?before=`, or `null` when there's nothing earlier.
  - `groupByWeek<T extends { class_date: string }>(rows: T[], mondays: string[]): { monday: string; days: T[] }[]`. Newest week first, days oldest to newest within a week, weeks with no rows dropped.
  - `liftsOn<T extends { logged_on: string | null }>(logs: T[], date: string): T[]`
  - `benchOn<T extends Pick<BenchResult, 'done_on' | 'workout_date'>>(results: T[], date: string): T[]`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/past-workouts.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { benchOn, groupByWeek, liftsOn, pastWindow } from './past-workouts';

// 2026-11-16 and 2026-11-23 are Mondays. 2026-11-20 is a Friday.
describe('pastWindow', () => {
  it('ends the first page at the week of the last class done', () => {
    const w = pastWindow({ lastDone: '2026-11-20', earliest: '2026-09-01' });
    expect(w.mondays).toEqual(['2026-11-16', '2026-11-09', '2026-11-02', '2026-10-26']);
    expect(w.from).toBe('2026-10-26');
    expect(w.to).toBe('2026-11-20');
    expect(w.earlier).toBe('2026-10-26');
  });

  it('caps the range at the last class done mid-week', () => {
    const w = pastWindow({ lastDone: '2026-11-18', earliest: '2026-09-01' });
    expect(w.to).toBe('2026-11-18');
  });

  it('moves back exactly 4 weeks with before', () => {
    const w = pastWindow({ before: '2026-10-26', lastDone: '2026-11-20', earliest: '2026-09-01' });
    expect(w.mondays).toEqual(['2026-10-19', '2026-10-12', '2026-10-05', '2026-09-28']);
    expect(w.to).toBe('2026-10-23');
  });

  it('stops at the week of the earliest workout and offers nothing earlier', () => {
    const w = pastWindow({ before: '2026-09-14', lastDone: '2026-11-20', earliest: '2026-09-02' });
    expect(w.mondays).toEqual(['2026-09-07', '2026-08-31']);
    expect(w.from).toBe('2026-08-31');
    expect(w.earlier).toBeNull();
  });

  it('offers nothing earlier when the page ends exactly at the earliest week', () => {
    const w = pastWindow({ lastDone: '2026-11-20', earliest: '2026-10-28' });
    expect(w.mondays.at(-1)).toBe('2026-10-26');
    expect(w.earlier).toBeNull();
  });

  it('falls back to the newest page for a bad before', () => {
    const newest = pastWindow({ lastDone: '2026-11-20', earliest: '2026-09-01' });
    for (const before of ['nope', '2026-13-40x', '', null, undefined, '2030-01-06', '2020-01-06']) {
      expect(pastWindow({ before, lastDone: '2026-11-20', earliest: '2026-09-01' })).toEqual(newest);
    }
  });

  it('is empty when nothing has run', () => {
    expect(pastWindow({ lastDone: '2026-11-20', earliest: null })).toEqual({ mondays: [], from: null, to: null, earlier: null });
  });
});

describe('groupByWeek', () => {
  it('groups newest week first, days in order, and drops empty weeks', () => {
    const rows = [{ class_date: '2026-11-17' }, { class_date: '2026-11-02' }, { class_date: '2026-11-16' }];
    expect(groupByWeek(rows, ['2026-11-16', '2026-11-09', '2026-11-02'])).toEqual([
      { monday: '2026-11-16', days: [{ class_date: '2026-11-16' }, { class_date: '2026-11-17' }] },
      { monday: '2026-11-02', days: [{ class_date: '2026-11-02' }] },
    ]);
  });
});

describe('liftsOn', () => {
  it('keeps logs from that date and drops undated ones', () => {
    const logs = [{ logged_on: '2026-11-17' }, { logged_on: null }, { logged_on: '2026-11-18' }];
    expect(liftsOn(logs, '2026-11-17')).toEqual([{ logged_on: '2026-11-17' }]);
  });
});

describe('benchOn', () => {
  it('matches workout_date first, done_on only when workout_date is empty', () => {
    const r = [
      { id: 1, workout_date: '2026-11-17', done_on: '2026-11-19' },
      { id: 2, workout_date: null, done_on: '2026-11-17' },
      { id: 3, workout_date: '2026-11-18', done_on: '2026-11-17' },
      { id: 4, workout_date: null, done_on: null },
    ];
    expect(benchOn(r, '2026-11-17').map((x) => x.id)).toEqual([1, 2]);
  });
});
```

- [ ] **Step 2: Run the tests to check they fail**

Run: `npx vitest run src/lib/past-workouts.test.ts`
Expected: FAIL, "Failed to resolve import './past-workouts'".

- [ ] **Step 3: Implement**

Create `src/lib/past-workouts.ts`:

```ts
import { addDays, mondayOf } from './dates';
import type { BenchResult } from './benchmarks';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Which weeks one page of past workouts shows, newest first. The first page ends at the
 * week of the last class that's over; `before` (a Monday from the previous page's
 * "Show earlier") moves back a page. Anything odd in `before` gives the first page.
 */
export function pastWindow({
  before,
  lastDone,
  earliest,
  weeks = 4,
}: {
  before?: string | null;
  lastDone: string;
  earliest: string | null;
  weeks?: number;
}) {
  if (!earliest) return { mondays: [] as string[], from: null, to: null, earlier: null };
  const top = mondayOf(lastDone);
  const floor = mondayOf(earliest);
  let newest = top;
  if (before && DATE.test(before) && mondayOf(before) === before) {
    const wanted = addDays(before, -7);
    if (wanted <= top && wanted >= floor) newest = wanted;
  }
  const mondays: string[] = [];
  for (let m = newest; m >= floor && mondays.length < weeks; m = addDays(m, -7)) mondays.push(m);
  const oldest = mondays[mondays.length - 1];
  const friday = addDays(newest, 4);
  return {
    mondays,
    from: oldest,
    to: friday < lastDone ? friday : lastDone,
    earlier: oldest > floor ? oldest : null,
  };
}

/** Rows grouped into the given weeks (newest first), days in order, empty weeks dropped. */
export function groupByWeek<T extends { class_date: string }>(rows: T[], mondays: string[]) {
  return mondays
    .map((monday) => ({
      monday,
      days: rows.filter((r) => mondayOf(r.class_date) === monday).sort((a, b) => (a.class_date < b.class_date ? -1 : 1)),
    }))
    .filter((w) => w.days.length > 0);
}

/** Your lift logs from that day. Undated logs ("I don't remember when") never match. */
export function liftsOn<T extends { logged_on: string | null }>(logs: T[], date: string) {
  return logs.filter((l) => l.logged_on === date);
}

/** Your benchmark results for that day's workout: the workout it was logged against, else the day it was done. */
export function benchOn<T extends Pick<BenchResult, 'done_on' | 'workout_date'>>(results: T[], date: string) {
  return results.filter((r) => (r.workout_date ?? r.done_on) === date);
}
```

Note: `'2026-13-40x'` fails the regex. A regex-valid date that isn't a Monday fails the `mondayOf(before) === before` check. Out-of-range Mondays (`2030-…`, `2020-…`) fail the `wanted` bounds. In all those cases you get the first page.

- [ ] **Step 4: Run the tests to check they pass**

Run: `npx vitest run src/lib/past-workouts.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/past-workouts.ts src/lib/past-workouts.test.ts
git commit -m "Past workouts: paging and per-day result helpers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: `attended` ✓ on `WeekDigest`

**Files:**
- Modify: `src/components/WeekDigest.tsx`
- Modify: `src/app/globals.css` (near the `.digest-*` rules, around line 384)

**Interfaces:**
- Consumes: nothing new.
- Produces: `WeekDigest` accepts `attended?: string[]` (dates). A row whose `date` is in it shows `<span className="digest-in">✓<span className="sr-only"> you were in</span></span>` at the right end of the row.

- [ ] **Step 1: Add the prop**

In `src/components/WeekDigest.tsx`, add `attended` to the destructured props and the props type:

```tsx
export function WeekDigest({
  days,
  today,
  isAdmin,
  heading,
  sub,
  rsvp,
  attended,
}: {
  days: DigestDay[];
  today: string;
  isAdmin: boolean;
  heading: string;
  sub?: string;
  /** Show an "I'm in" chip on each day: which days you're in, and how many others are. */
  rsvp?: { mine: string[]; others: Record<string, number> };
  /** Past days you were in, marked with a ✓. */
  attended?: string[];
}) {
```

- [ ] **Step 2: Render the ✓**

Directly below the existing `{rsvp && <RsvpChip … />}` line, add:

```tsx
              {attended?.includes(date) && (
                <span className="digest-in">
                  ✓<span className="sr-only"> you were in</span>
                </span>
              )}
```

- [ ] **Step 3: Style it**

In `src/app/globals.css`, right after the `.digest-tags` rule, add:

```css
.digest-in { flex: none; align-self: center; width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; background: var(--gold); color: var(--ink); font-weight: 800; font-size: 14px; }
```

The `.att-dot.in` gold is the same colour Show-ups uses for "you were in", and it works in both themes.

- [ ] **Step 4: Type-check and run tests**

Run: `npx tsc --noEmit && npm test`
Expected: no type errors, and all tests pass. `/workouts` doesn't pass `attended`, so nothing changes there.

- [ ] **Step 5: Commit**

```bash
git add src/components/WeekDigest.tsx src/app/globals.css
git commit -m "WeekDigest: optional ✓ for days you were in

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: `/workouts/past` page and the link to it

**Files:**
- Create: `src/app/(app)/workouts/past/page.tsx`
- Create: `src/app/(app)/workouts/past/loading.tsx`
- Modify: `src/app/(app)/workouts/page.tsx` (end of `<main>`)
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `pastWindow` and `groupByWeek` (Task 1), `WeekDigest` with `attended` and `DigestDay` (Task 2), `getSchedule` from `@/lib/data`, `positionOn` from `@/lib/programming/engine`, `lastClassDone` and `shortDate` from `@/lib/dates`, `requireMember` and `signedIn` from `@/lib/supabase/server`, `Icon`.
- Produces: the route `/workouts/past?before=<monday>`.

- [ ] **Step 1: Write the page**

Create `src/app/(app)/workouts/past/page.tsx`:

```tsx
import Link from 'next/link';
import { requireMember, signedIn } from '@/lib/supabase/server';
import { lastClassDone, shortDate } from '@/lib/dates';
import { getSchedule } from '@/lib/data';
import { positionOn } from '@/lib/programming/engine';
import { groupByWeek, pastWindow } from '@/lib/past-workouts';
import { WeekDigest } from '@/components/WeekDigest';
import { Icon } from '@/components/Icon';
import type { Part } from '@/lib/types';

/** Every published workout that's already run, newest first, 4 weeks a page. */
export default async function PastWorkoutsPage({ searchParams }: { searchParams: Promise<{ before?: string }> }) {
  const { before } = await searchParams;
  const { supabase, userId } = await signedIn();
  const lastDone = lastClassDone();
  const [{ me }, { data: first }, schedule] = await Promise.all([
    requireMember(),
    supabase.from('workouts').select('class_date').eq('status', 'published').order('class_date').limit(1).maybeSingle(),
    getSchedule(supabase),
  ]);
  const win = pastWindow({ before, lastDone, earliest: first?.class_date ?? null });

  const [{ data: workouts }, { data: mine }] =
    win.from && win.to
      ? await Promise.all([
          supabase.from('workouts').select('class_date, title, focus, status, parts').eq('status', 'published').gte('class_date', win.from).lte('class_date', win.to),
          supabase.from('attendance').select('class_date').eq('user_id', userId).gte('class_date', win.from).lte('class_date', win.to),
        ])
      : [{ data: [] }, { data: [] }];

  const weeks = groupByWeek(workouts ?? [], win.mondays);
  const attended = (mine ?? []).map((a) => a.class_date as string);
  const label = (monday: string) => {
    const pos = positionOn(monday, schedule);
    return pos.started ? `Cycle ${pos.cycle} · Week ${pos.week.index + 1}/${pos.totalWeeks} · ${pos.week.label}` : `Week of ${shortDate(monday).split(' · ')[1]}`;
  };

  return (
    <main className="screen">
      <div className="row">
        <Link href="/workouts" className="avatar" style={{ background: 'var(--card)', color: 'var(--ink)' }} aria-label="Back to workouts">
          <Icon name="back" />
        </Link>
        <h1 className="grow">Past workouts</h1>
      </div>
      {weeks.length === 0 && <p className="muted">No past workouts yet.</p>}
      {weeks.map((w) => (
        <WeekDigest
          key={w.monday}
          days={w.days.map((d) => ({ date: d.class_date, workout: { ...d, parts: (d.parts ?? []) as Part[] } }))}
          today=""
          isAdmin={me.is_admin}
          heading={label(w.monday)}
          attended={attended}
        />
      ))}
      {win.earlier && (
        <Link href={`/workouts/past?before=${win.earlier}`} className="btn ghost" style={{ alignSelf: 'center' }}>
          Show earlier
        </Link>
      )}
    </main>
  );
}
```

Notes for the implementer:
- `today=""` means no row gets today's highlight. The list ends at `lastClassDone()`, and today's class shouldn't be highlighted as "today" here.
- `isAdmin` only affects unposted rows, and every row here is published, so passing it is harmless.
- `pos.cycle` is the 1-based cycle number (see `CyclePosition` in `src/lib/programming/engine.ts:129`).
- `.screen` lays out its children in a column, so `alignSelf` centres the button. If it doesn't, wrap the link in `<div className="row" style={{ justifyContent: 'center' }}>`.

- [ ] **Step 2: Add the loading skeleton**

Create `src/app/(app)/workouts/past/loading.tsx`:

```tsx
export { default } from '@/components/PageSkeleton';
```

- [ ] **Step 3: Add the link on `/workouts`**

In `src/app/(app)/workouts/page.tsx`, add `import Link from 'next/link';` at the top. Then add this as the last child of `<main>`, after the `weeks.slice(1).map(...)` block:

```tsx
      <Link href="/workouts/past" className="past-link">
        Past workouts →
      </Link>
```

- [ ] **Step 4: Style the link**

In `src/app/globals.css`, after the `.week-fold` rules (around line 401), add:

```css
.past-link { align-self: center; padding: 12px; color: var(--ink-3); font-weight: 700; font-size: 14px; text-decoration: none; }
.past-link:hover { color: var(--ink); }
```

- [ ] **Step 5: Type-check and test**

Run: `npx tsc --noEmit && npm test`
Expected: no type errors, and all tests pass. If `src/app/route-config.test.ts` lists routes and fails on the new one, add `/workouts/past` to it the way the other `(app)` routes are listed.

- [ ] **Step 6: Check it in the browser**

Start the dev server (`npm run dev`, or the project's `.claude/launch.json` entry if there is one) and open `http://localhost:3000/workouts` in the browser pane. Check:
1. "Past workouts →" is at the bottom, muted.
2. Tapping it shows weeks newest first, with cycle labels.
3. ✓ marks match the days Show-ups says you were in.
4. "Show earlier" goes back 4 weeks, and disappears on the page with the first workout.
5. `/workouts/past?before=garbage` shows the newest page.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(app)/workouts/past" "src/app/(app)/workouts/page.tsx" src/app/globals.css
git commit -m "Past workouts page, linked quietly from Workouts

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: "Your day" on past workout pages

**Files:**
- Create: `src/components/YourDay.tsx`
- Modify: `src/app/(app)/workouts/[date]/page.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `liftsOn` and `benchOn` (Task 1), `formatScore`, `Benchmark` and `BenchResult` from `@/lib/benchmarks`, `lb` from `@/lib/ui`.
- Produces: `YourDay({ wasIn, lifts, results, benchmarks }: { wasIn: boolean; lifts: { movement: string; weight: number; reps: number; is_pr: boolean }[]; results: BenchResult[]; benchmarks: Benchmark[] })`

- [ ] **Step 1: Write the component**

Create `src/components/YourDay.tsx`:

```tsx
import { formatScore, type Benchmark, type BenchResult } from '@/lib/benchmarks';
import { lb } from '@/lib/ui';

/** On a past workout: were you in, and what you logged that day. */
export function YourDay({
  wasIn,
  lifts,
  results,
  benchmarks,
}: {
  wasIn: boolean;
  lifts: { movement: string; weight: number; reps: number; is_pr: boolean }[];
  results: BenchResult[];
  benchmarks: Benchmark[];
}) {
  const byId = new Map(benchmarks.map((b) => [b.id, b]));
  const bench = results.flatMap((r) => {
    const b = byId.get(r.benchmark_id);
    return b ? [{ id: r.id, name: b.name, score: formatScore(b, r) }] : [];
  });
  return (
    <div className="your-day">
      <div className={wasIn ? 'your-day-in' : 'muted'}>{wasIn ? '✓ You were in' : 'You weren’t in this one'}</div>
      {lifts.map((l, i) => (
        <div key={`l${i}`} className="small">
          {l.movement} · {lb(l.weight)}
          {l.reps > 1 ? ` × ${l.reps}` : ''} {l.is_pr && <span className="badge gold">BEST</span>}
        </div>
      ))}
      {bench.map((b) => (
        <div key={`b${b.id}`} className="small">
          ★ {b.name} · {b.score}
        </div>
      ))}
    </div>
  );
}
```

"BEST" and `lb()` match how `src/app/(app)/lifts/[movement]/page.tsx:50` shows the same logs. If `lb()` already appends the unit, that's correct: it's the same output as on that page.

- [ ] **Step 2: Load your lifts for that day and render the card**

In `src/app/(app)/workouts/[date]/page.tsx`:

a) Add these imports:

```tsx
import { YourDay } from '@/components/YourDay';
import { benchOn, liftsOn } from '@/lib/past-workouts';
```

b) Add one more entry to the existing `Promise.all`, after `getBenchmarks(supabase, userId)`, and a matching name `{ data: dayLifts }` at the end of the destructuring list:

```tsx
    date < todayLocal()
      ? supabase.from('lift_logs').select('movement_id, weight, reps, is_pr, logged_on').eq('user_id', userId).eq('logged_on', date).order('id')
      : Promise.resolve({ data: [] as { movement_id: number; weight: number; reps: number; is_pr: boolean; logged_on: string | null }[] }),
```

The destructuring becomes:

```tsx
  const [{ me }, { data: w }, { names, animals }, { bests, movements }, { data: attendance }, coachNote, { benchmarks, results }, { data: dayLifts }] = await Promise.all([
```

c) After the `maxes` line, add:

```tsx
  const movementName = new Map(movements.map((m) => [m.id, m.name]));
  const yourDay = upcoming ? null : (
    <YourDay
      wasIn={going}
      lifts={liftsOn(dayLifts ?? [], date).map((l) => ({ movement: movementName.get(l.movement_id) ?? 'Lift', weight: Number(l.weight), reps: l.reps, is_pr: l.is_pr }))}
      results={benchOn(results, date)}
      benchmarks={benchmarks}
    />
  );
```

d) Change the `meta` prop on `WorkoutView`:

```tsx
        meta={upcoming ? <WhosComing classDate={w.class_date} me={{ id: me.id, name: me.display_name, animal: me.animal }} others={others} going={going} /> : yourDay}
```

e) Change the back arrow's `href` and label:

```tsx
        <Link href={upcoming ? '/workouts' : '/workouts/past'} className="avatar" style={{ background: 'var(--card)', color: 'var(--ink)' }} aria-label={upcoming ? 'Back to workouts' : 'Back to past workouts'}>
```

Note: `upcoming` is `w.class_date >= todayLocal()`, so today's class counts as upcoming all day and keeps showing `WhosComing`. That's intentional: the RSVP still matters on the day. The lift query uses `date < todayLocal()`, the same rule, so it only runs when the card will actually show.

- [ ] **Step 3: Style the card**

In `src/app/globals.css`, next to `.past-link`, add:

```css
.your-day { display: flex; flex-direction: column; gap: 4px; }
.your-day-in { font-weight: 800; color: var(--gold-ink); }
```

- [ ] **Step 4: Type-check and test**

Run: `npx tsc --noEmit && npm test`
Expected: no type errors, and all tests pass.

- [ ] **Step 5: Check it in the browser**

On the dev server:
1. Open a past day you attended and logged a lift on. You should see "✓ You were in" and the lift line with the weight.
2. Open a past day you missed. You should see only "You weren't in this one".
3. On today's or a future workout, the "Who's coming" RSVP is unchanged.
4. On a past day, the back arrow goes to `/workouts/past`.
5. Log a lift from the past day's log form, and check that it shows up in "Your day" after the page refreshes.

- [ ] **Step 6: Commit**

```bash
git add src/components/YourDay.tsx "src/app/(app)/workouts/[date]/page.tsx" src/app/globals.css
git commit -m "Your day card on past workouts

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Tappable Show-ups calendar

**Files:**
- Modify: `src/components/AttendanceCalendar.tsx`
- Modify: `src/app/globals.css` (near `.att-dot`, around line 488)

**Interfaces:**
- Consumes: `shortDate` (already imported) and `next/link`.
- Produces: no API change. The `pages` prop is unchanged.

- [ ] **Step 1: Make dots links and fix the accessibility**

In `src/components/AttendanceCalendar.tsx`:

a) Add `import Link from 'next/link';`.

b) Replace the card's opening tag:

```tsx
      <div className="card att-cal" role="img" aria-label={`You made ${made} classes from ${day(first)} to ${day(last)}`}>
```

with:

```tsx
      <div className="card att-cal">
        <span className="sr-only">{`You made ${made} classes from ${day(first)} to ${day(last)}.`}</span>
```

c) Replace the dot rendering:

```tsx
            {w.days.map((d) => (
              <span key={d.date} className={`att-dot ${d.mark}`} title={d.date} />
            ))}
```

with:

```tsx
            {w.days.map((d) =>
              d.mark === 'in' || d.mark === 'missed' ? (
                <Link
                  key={d.date}
                  href={`/workouts/${d.date}`}
                  className={`att-dot ${d.mark}`}
                  aria-label={`${shortDate(d.date).replace(' · ', ' ')}, ${d.mark === 'in' ? 'you were in' : 'missed'}`}
                />
              ) : (
                <span key={d.date} className={`att-dot ${d.mark}`} aria-hidden="true" />
              ),
            )}
```

d) Mark the day-letter header row and the key's sample dots as `aria-hidden="true"`, since the links and the hidden summary now carry the meaning. On `<div className="att-row att-head">` add `aria-hidden="true"`. On the two `<span className="att-dot in" />` / `<span className="att-dot missed" />` inside `.att-key` add `aria-hidden="true"`.

- [ ] **Step 2: Focus ring**

In `src/app/globals.css`, after `.att-dot.ahead`, add:

```css
a.att-dot:focus-visible { outline: 2px solid var(--teal); outline-offset: 2px; }
```

- [ ] **Step 3: Type-check and test**

Run: `npx tsc --noEmit && npm test`
Expected: no type errors, and all tests pass.

- [ ] **Step 4: Check it in the browser**

Open `/lifts/attendance` on the dev server:
1. Dots look the same as before.
2. Tapping a gold dot opens that day's workout with "✓ You were in".
3. Tapping a grey (missed) dot opens that day with "You weren't in this one".
4. Days with no class aren't tappable.
5. Tabbing through shows a focus ring on each dot.
6. The page arrows still step through 4-week pages.

- [ ] **Step 5: Commit**

```bash
git add src/components/AttendanceCalendar.tsx src/app/globals.css
git commit -m "Show-ups: tap a day to open its workout

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Final check

**Files:** none.

- [ ] **Step 1: Full test and type-check**

Run: `npx tsc --noEmit && npm test`
Expected: no type errors, and all tests pass.

- [ ] **Step 2: Dark mode pass**

In the browser pane, switch to dark (the Me page's theme picker, or `resize_window` with `colorScheme: 'dark'`) and check `/workouts` (the link), `/workouts/past` (✓ marks, headers), a past workout ("Your day") and `/lifts/attendance` (focus ring). Everything should be readable, with no light-only backgrounds.

- [ ] **Step 3: Clutter check against the spec**

Confirm the only visible change to `/workouts` is the one muted link, and that `/workouts/[date]` for today or a future date looks exactly as it does on `main`.
