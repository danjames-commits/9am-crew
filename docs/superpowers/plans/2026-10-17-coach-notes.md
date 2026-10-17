# Coach Notes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admins can write, see and import coach-only notes for each workout; members can never read them.

**Architecture:** A new table `workout_coach_notes`, keyed by `class_date` and readable and writable only by admins through row-level security, so members can't reach the notes even through the API. `saveWorkout` saves the notes alongside the workout (one Save button). The builder gets a notes box, and the workout page shows the notes to admins only.

**Tech Stack:** Next.js 16 (App Router, server actions), Supabase Postgres with RLS, vitest, PGlite (`npm run test:db`).

**Spec:** No separate design doc; the user skipped the questions. Requirements from the conversation on 2026-10-17:
- Every workout imported from the Court6 program carries `coach_notes`: coach-only logistics (running the class in waves, movement screens, who records splits).
- Only admins see them. Members never do.
- Admins can edit them in the builder.
- The program import loads them.

## Global Constraints

- Coach notes are stored as plain text, at most 2000 characters, with line breaks kept.
- Members (non-admins, approved or not) must get zero rows from `workout_coach_notes`, enforced in the database, not just the UI.
- Deleting a workout deletes its coach notes.
- An empty note is not stored: saving blank text removes the row.
- The migration file is `supabase/migration-008-coach-notes.sql`. Jake runs it in the Supabase SQL editor before merging, because a push to `main` goes live.
- Match the existing UI: plain `textarea` and the existing `card` / `notice` / `eyebrow` classes (the project has no component library).
- No change to the `workouts` table or the `parts` JSON.

## Review Focus

1. **Notes on a brand-new day:** an admin types notes in the builder before the workout has ever been saved. The workout row must exist first (foreign key), then the notes save. Expected: one Save stores both. (Task 3, Step 1 test.)
2. **Clearing notes:** an admin empties the box and saves. Expected: the row is deleted and the workout page shows no notes card. (Task 2 test, plus Task 3 Step 3.)
3. **A member reads the API directly:** a member queries `workout_coach_notes` with their own session. Expected: zero rows, and inserts and updates fail. (Task 1 tests.)
4. **The workout saves but the notes fail:** expected: the builder shows the error and stays marked unsaved, never a silent "Saved". (Task 3, Step 3.)
5. **Pasted text with Windows line breaks or over 2000 characters:** expected: `\r\n` becomes `\n`, the outer whitespace is trimmed, and the text is cut to 2000. (Task 2 test.)

---

### Task 1: Admin-only coach notes table

**Files:**
- Create: `supabase/migration-008-coach-notes.sql`
- Modify: `scripts/test-db.mjs` (run the new migration after line 29; add checks before the `admin_remove_member` block near the end)
- Modify: `README.md` (in "For developers", one line saying coach notes live in `workout_coach_notes`, admins only)

**Interfaces:**
- Produces: table `public.workout_coach_notes (class_date date primary key references public.workouts (class_date) on delete cascade on update cascade, body text not null check (char_length(body) between 1 and 2000), updated_at timestamptz not null default now())`.
- Produces: RLS policies `"admins read coach notes"`, `"admins add coach notes"`, `"admins edit coach notes"` and `"admins delete coach notes"`, all using `public.is_admin()`.

- [ ] **Step 1: Write the failing checks in `scripts/test-db.mjs`**

At this point A is the admin, B is an approved member and C is an approved admin. Insert a workout first, as admin A: `insert into public.workouts (class_date, title) values ('2026-11-02', 'Test day')`. Then:

```js
await as(A, `insert into public.workout_coach_notes (class_date, body) values ('2026-11-02', 'Run in two waves')`);
r = await as(C, `select body from public.workout_coach_notes`);
assert.deepEqual(r.rows.map((x) => x.body), ['Run in two waves']);
r = await as(B, `select count(*)::int as n from public.workout_coach_notes`);
assert.equal(r.rows[0].n, 0);
await fails(B, `insert into public.workout_coach_notes (class_date, body) values ('2026-11-02', 'x')`, 'member writes coach notes');
await as(B, `update public.workout_coach_notes set body = 'hacked'`);
r = await db.query(`select body from public.workout_coach_notes`);
assert.equal(r.rows[0].body, 'Run in two waves');
await fails(A, `insert into public.workout_coach_notes (class_date, body) values ('2026-11-03', 'no workout')`, 'notes without a workout');
await fails(A, `insert into public.workout_coach_notes (class_date, body) values ('2026-11-02', '')`, 'empty note');
await as(A, `delete from public.workouts where class_date = '2026-11-02'`);
r = await db.query(`select count(*)::int as n from public.workout_coach_notes`);
assert.equal(r.rows[0].n, 0);
ok('coach notes: admins only, need a workout, go when the workout goes');
```

- [ ] **Step 2: Run `npm run test:db`.** Expected: FAIL with `relation "public.workout_coach_notes" does not exist`.

- [ ] **Step 3: Write `supabase/migration-008-coach-notes.sql`**

Follow the style of `migration-004-cycles.sql`: `create table if not exists`, `alter table … enable row level security`, and `drop policy if exists` before each `create policy`. All four policies are `to authenticated` and use `public.is_admin()`. Insert and update also need `with check (public.is_admin())`. Add a header comment saying what the table is for and that members can't read it. Load it in `scripts/test-db.mjs` with the same `readFileSync` line as migration 007.

- [ ] **Step 4: Run `npm run test:db`.** Expected: PASS, including `✓ coach notes: admins only, need a workout, go when the workout goes`.

- [ ] **Step 5: Add the README line, then commit**

```bash
git add supabase/migration-008-coach-notes.sql scripts/test-db.mjs README.md
git commit -m "Coach notes table, admins only"
```

---

### Task 2: Cleaning the note text

**Files:**
- Create: `src/lib/coach-notes.ts`
- Test: `src/lib/coach-notes.test.ts`

**Interfaces:**
- Produces: `export const COACH_NOTES_MAX = 2000;`
- Produces: `export function cleanCoachNotes(raw: unknown): string`. Returns the cleaned text; `''` means "no note".

- [ ] **Step 1: Write the failing tests** (`describe('cleanCoachNotes')`)

```ts
expect(cleanCoachNotes('  Run in two waves  ')).toBe('Run in two waves');
expect(cleanCoachNotes('Line one\r\nLine two')).toBe('Line one\nLine two');
expect(cleanCoachNotes('   \n  ')).toBe('');
expect(cleanCoachNotes(undefined)).toBe('');
expect(cleanCoachNotes(42)).toBe('');
expect(cleanCoachNotes('x'.repeat(2500))).toHaveLength(2000);
```

- [ ] **Step 2: Run `npx vitest run src/lib/coach-notes.test.ts`.** Expected: FAIL, module not found.

- [ ] **Step 3: Implement `cleanCoachNotes` in `src/lib/coach-notes.ts`.** Non-strings become `''`. Replace `\r\n` and `\r` with `\n`, trim, then slice to `COACH_NOTES_MAX`.

- [ ] **Step 4: Run `npx vitest run src/lib/coach-notes.test.ts`.** Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/coach-notes.ts src/lib/coach-notes.test.ts
git commit -m "Clean coach note text"
```

---

### Task 3: Save and edit coach notes in the builder

**Files:**
- Modify: `src/app/actions.ts` (`saveWorkout`, lines 199–231)
- Modify: `src/app/(app)/admin/build/[date]/page.tsx` (fetch the note, pass it in)
- Modify: `src/components/admin/Builder.tsx` (prop, state, textarea, save)

**Interfaces:**
- Consumes: `cleanCoachNotes` from Task 2 and the table from Task 1.
- Produces: `saveWorkout(input: { class_date; title; focus; why; parts; status; coach_notes?: string })`. When `coach_notes` is `undefined`, the notes are left untouched (keeps `aiDraftDay` and any other caller unaffected).
- Produces: a `Builder` prop `savedNotes: string`.

- [ ] **Step 1: Write down the order rule as a comment in `saveWorkout`, then implement it**

The workout upsert runs first. Only after it succeeds:
- if `coach_notes !== undefined` and `cleanCoachNotes(coach_notes)` is `''`, delete the row for `class_date`;
- otherwise upsert `{ class_date, body, updated_at }` with `onConflict: 'class_date'`.

On a notes error, return `{ error: 'Workout saved, but the coach notes didn’t save: ' + error.message }`.

- [ ] **Step 2: Build page.** Add `supabase.from('workout_coach_notes').select('body').eq('class_date', date).maybeSingle()` to the existing `Promise.all`, and pass `savedNotes={notes?.body ?? ''}`. The page already requires an admin.

- [ ] **Step 3: Builder**
- State: `const [notes, setNotes] = useState(savedNotes)`.
- Typing in the box sets `dirty` and clears `msg`, like `update()`.
- `save()` passes `coach_notes: notes`. When `saveWorkout` returns an error, `dirty` stays true and `msg` shows the error (already the existing behaviour for errors).
- Place it right after the `draft.why` card:
  - a `card stack tight` with an `eyebrow` reading `Coach notes · admins only`;
  - a `textarea` with `rows={4}`, `maxLength={2000}`, `placeholder="Class logistics for coaches: waves, set-up, who records what."`;
  - below it, a `muted small` line: `Members never see these.`

- [ ] **Step 4: Verify in the browser (dev server, signed in as an admin)**
  1. Open `/admin/build/<an unsaved weekday>`, type a note and tap Save draft. Expected: "Saved as a draft", and the note is still there after a reload.
  2. Clear the note and save. Expected: an empty box after a reload, and no row in `workout_coach_notes` for that date.
  3. Run `npx tsc --noEmit` and `npm test`. Expected: no errors; all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/actions.ts "src/app/(app)/admin/build/[date]/page.tsx" src/components/admin/Builder.tsx
git commit -m "Builder: coach notes box, saved with the workout"
```

---

### Task 4: Show coach notes to admins on the workout page

**Files:**
- Modify: `src/app/(app)/workouts/[date]/page.tsx`

**Interfaces:**
- Consumes: the table from Task 1.

- [ ] **Step 1: Fetch the note only for admins.** When `me.is_admin`, run `supabase.from('workout_coach_notes').select('body').eq('class_date', date).maybeSingle()` in the existing `Promise.all`; otherwise resolve to `{ data: null }`. Members never send the query, and RLS would return nothing if they did.

- [ ] **Step 2: Render it.** When there's a note, show a `card stack tight` between the focus line and the check-in card:
  - an `eyebrow` reading `Coach notes · admins only`;
  - the body in `<p className="pre">` (keeps line breaks).

- [ ] **Step 3: Verify in the browser**
  1. As an admin, open a workout with a note. Expected: the card shows, with line breaks kept.
  2. As a non-admin member, open the same published workout. Expected: no card, and no `workout_coach_notes` request in the network tab.
  3. Open a workout without a note as an admin. Expected: no card.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/workouts/[date]/page.tsx"
git commit -m "Workout page: coach notes for admins"
```

---

### Task 5: Import hook for the program

**Files:**
- Modify: `docs/programming/README.md`

**Interfaces:**
- Consumes: the program JSON's `workouts[].coach_notes`, and the table from Task 1.
- Produces: the SQL shape the program import script must emit, after each workout upsert:

```sql
insert into public.workout_coach_notes (class_date, body) values ('2026-10-26', '…')
on conflict (class_date) do update set body = excluded.body, updated_at = now();
```

- [ ] **Step 1: Document it.** Add a "Coach notes" section to `docs/programming/README.md`: the program's `coach_notes` go into `workout_coach_notes` with the SQL above, empty notes are skipped, and the insert must come after the workout row for the same date.

- [ ] **Step 2: Commit**

```bash
git add docs/programming/README.md
git commit -m "Docs: how imported coach notes are loaded"
```

---

## Before merging

- [ ] `npm run build` passes. It runs vitest, the database checks and the Next build.
- [ ] Run `supabase/migration-008-coach-notes.sql` in the Supabase SQL editor, then merge. If the code goes live first, the builder's save fails on the missing table. Give Dan a heads-up.
