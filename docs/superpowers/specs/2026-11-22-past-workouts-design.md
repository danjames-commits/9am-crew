# Past workouts: design

Date: 2026-11-22 · Status: draft for Jake's review

## Why

Members can't go back and see a workout that already happened. `/workouts` starts at this week's Monday, so earlier days are unreachable unless you type the URL. The detail page `/workouts/[date]` already renders past days fine (it hides RSVP and AI scaling), so what's missing is a way to get there, plus a view of what *you* did that day.

**Constraint:** don't clutter the app. The screens people use every day should barely change.

**Success:** a member taps "Past workouts →" at the bottom of Workouts, scrolls back to "that squat day in Cycle 1", sees they were in, taps it, and sees the workout along with what they lifted.

## Goals (v1)

- A class archive: every published workout that has already run, newest first, grouped by week with cycle labels.
- Your own history in that archive: a ✓ on days you attended.
- A "Your day" card on past workout pages: whether you were in, plus the lifts and benchmark results you logged for that date.
- Dots in the Show-ups calendar link to that day's workout.

## Non-goals

- Other members' results, leaderboards or comparisons on past days.
- Comparing results with previous attempts (My stats already does this).
- Showing drafts or unbuilt days in the archive. That includes admins: the archive is a record of what ran, not a planning tool.
- Search or filtering.
- Any schema change.

## Approach

We weighed three options:

1. Only make existing things tappable (Show-ups dots plus a "Your day" card). Rejected as the only change: a dot doesn't tell you what the workout was, and My stats isn't where people would look for past workouts.
2. **One quiet link to one new page. Chosen.**
3. Collapsible past weeks inside `/workouts`. Rejected because it clutters the daily screen and pushes "This week" down.

This design is option 2, with option 1 included.

## Design

### Entry point

A single muted text link at the bottom of `/workouts`, below the last week fold: **"Past workouts →"** linking to `/workouts/past`. Nothing else on `/workouts` changes. The link always shows, even before any workout has run.

### `/workouts/past`

- **Contents:** workouts with `status = 'published'` and `class_date <= lastClassDone()`. That's the cutoff Show-ups uses, so today's class only appears after class has ended.
- **Order and grouping:** newest week first. Within a week, days run Monday to Friday, the same as `/workouts`.
- **Week header:** from `positionOn(monday, schedule)`, formatted like `/workouts` as `Cycle N · Week i/n · <label>`. If the week isn't in any cycle (`started` is false), it shows `Week of <Mon date>`.
- **Rows:** each week is a `WeekDigest` with `heading=""`, so rows look exactly like they do today (day, title, tags), and each row links to `/workouts/[date]`.
- **Attendance:** `WeekDigest` gets a new optional prop `attended?: string[]` (dates). When a row's date is in it, the row shows a small ✓ with screen-reader text "you were in". This is the only change to a shared component. `/workouts` doesn't pass it.
- **Paging:** 4 weeks per page. The first page ends at the week containing `lastClassDone()`. "Show earlier" is a plain link to `/workouts/past?before=<monday>`, where `<monday>` is the Monday of the oldest week on the current page. It's rendered on the server, with no client state. The link is hidden once the page reaches the week of the earliest published workout.
- **Empty weeks:** weeks inside the window that have no published workout (a holiday, a break between cycles) are skipped, not shown blank.
- **Queries per page:** three, run in parallel: workouts in the date window (`class_date, title, focus, status, parts`), your attendance in the window, and `getSchedule()`. A fourth, tiny query, the earliest published `class_date`, decides whether "Show earlier" is shown.
- **Back link:** the page's back arrow goes to `/workouts`.
- **Loading:** `loading.tsx` uses `PageSkeleton`, like every other route.
- **Empty state:** if there are no past workouts, it shows "No past workouts yet."
- **Bad input:** a `before` that isn't `YYYY-MM-DD` is ignored, and you get the newest page.

### "Your day" on `/workouts/[date]`

- Shown only when the date is in the past (`!upcoming`). It goes in the `meta` slot of `WorkoutView`, where `WhosComing` sits on upcoming days, so the layout doesn't change.
- **New component** `src/components/YourDay.tsx` is server-rendered and display-only. It shows:
  - Attendance: "You were in" with a ✓, or a muted "You weren't in this one". If you weren't in and logged nothing, that line is the whole card.
  - Lifts: your `lift_logs` with `logged_on = date`, each as `<Movement> · <weight> × <reps>`, with the existing PR badge style when `is_pr` is set.
  - Benchmarks: your `benchmark_results` that match the date, formatted with the same score formatter the Benchmarks tab uses.
  - No prompt to log. The existing log form stays below as it does today, so backfilling still works.
- **Benchmark date rule:** a result belongs to the date when `workout_date = date`, or when `workout_date` is null and `done_on = date`.
- **Data:** benchmark results reuse `getBenchmarks(...).results`, which the page already loads with `done_on` and `workout_date`. Lifts need one new query, run only on past days and in the same `Promise.all`: `lift_logs` → `movement_id, weight, reps, is_pr` where the user is you and `logged_on = date`. `getBests` only returns per-movement bests, not raw logs. Movement names come from the `movements` the page already has. Attendance is already loaded on this page.
- **Back arrow:** goes to `/workouts/past` when the date is in the past, and to `/workouts` otherwise.

### Show-ups calendar

- In `AttendanceCalendar`, each dot with mark `in` or `missed` becomes a `<Link href="/workouts/<date>">`. Other marks, such as days with no class or future days, stay plain dots. The look doesn't change. Links get a visible focus ring.
- Accessibility: the card loses `role="img"`. Each linked dot gets an `aria-label` such as "Tue Nov 4, you were in" or "Tue Nov 4, missed". The summary sentence the card currently has in its `aria-label` moves into visually hidden text.

## Units

| Unit | Purpose |
|---|---|
| `src/lib/past-workouts.ts` (new, pure) | `pastWindow(before, lastDone, earliest, weeks = 4)` returns the Mondays to show and whether an earlier page exists. `groupByWeek(workouts)` groups by Monday, newest first. `resultsOn(liftLogs, benchResults, date)` picks out your results for a date. |
| `src/app/(app)/workouts/past/page.tsx` + `loading.tsx` (new) | The archive page. |
| `src/components/YourDay.tsx` (new) | The "Your day" card. |
| `WeekDigest.tsx` (edit) | The optional `attended` prop and ✓. |
| `AttendanceCalendar.tsx` (edit) | Dots become links, plus the accessibility changes. |
| `/workouts/page.tsx` (edit) | The "Past workouts →" link. |
| `/workouts/[date]/page.tsx` (edit) | "Your day" in the meta slot on past days, and the back-link target. |
| `globals.css` (edit) | Styles for the ✓, the past link and the dot focus ring, using existing tokens (light and dark). |

## Testing

- Vitest for `src/lib/past-workouts.ts`:
  - The first page ends at the week of `lastClassDone()`.
  - `before` moves the window back exactly 4 weeks.
  - No earlier page once the earliest workout's week is shown.
  - An invalid `before` falls back to the newest page.
  - Weeks with no workouts are dropped.
  - Benchmark date rule: `workout_date` wins, `done_on` is used only when `workout_date` is null, and results with neither date are excluded.
  - Lift logs with no `logged_on` are excluded.
- Manual check in the browser pane against the dev server: the link on `/workouts`, paging back and the "Show earlier" stop, ✓ marks matching Show-ups, a past workout's page showing "Your day", the back arrow going to `/workouts/past`, Show-ups dots opening the right day, keyboard focus on the dots, and dark mode.

## Open questions

None.
