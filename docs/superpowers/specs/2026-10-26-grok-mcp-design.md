# Grok MCP connector: design

Date: 2026-10-26 · Status: draft for Jake's review

## Why

Jake plans 9am Crew programming with a Grok bot in the Grok app. Right now Grok writes the workouts and Jake copies each day into the builder by hand. That was slow even for a small job ("add variety to one weekday across a whole cycle"), and the jobs are going to get bigger.

An MCP server inside the app lets Grok read the programming and write changes straight in. Jake reviews in the Grok chat, then tells the bot to push.

**Success:** Jake asks Grok for "vary the conditioning on every Thursday of Cycle 2." Grok reads the cycle, shows a day-by-day preview, Jake says "push," and the change is live. He copies nothing and opens no builder.

## Goals (v1)

- Grok can read:
  - cycles, including the week-by-week plan and the weekday plan
  - workout days in a date range, with all parts, all 4 levels, lifts and coach notes
  - the movement list
- Grok can change, through **preview → push**:
  - workout days: create, edit, delete, and set published or draft
  - coach notes
  - cycles: create, edit (name, why, brief, goals, weeks, days) and delete
- One push can cover many days and cycles, and it applies **all or nothing**.
- **Undo** reverses a whole push, deletes included.
- Changes follow the same rules the builder and planner already enforce.
- **Future days only.** Grok changes the plan ahead, never what has already happened (see "Future only" below).

## Non-goals

- Member management of any kind: approving, removing, admin rights, or member data. Jake said he doesn't need it.
- Comments, attendance, lift logs, recaps, avatars.
- A screen in the app for change history. Grok and the database are enough for v1.
- Changes to the existing builder, planner or Claude features.

## Anti-goals (a failure even if it technically works)

- Grok saves something without showing Jake the preview first. This is enforced by the tool descriptions telling Grok to show the preview and wait for "push." Jake decided that's enough; there is no in-app approve step.
- The MCP path accepts data the builder would reject, or that breaks how a workout card renders.
- A service-role key, or anything else that skips the database's admin rules (RLS).
- A push that half-applies: some days changed, others not, with no clean way back.
- Anything that needs Jake to have Vercel access. He ships through PRs to `main`, which deploy automatically.

## Constraints

**Grok app (from third-party guides, not official xAI docs):**
- Custom connectors must be a public HTTPS URL using Streamable HTTP (or SSE).
- Sign-in is **OAuth only**, so a pasted secret key isn't possible.
- The bot reportedly sometimes leaves out the `MCP-Protocol-Version` header on reused sessions, so the server must not reject requests that are missing it.
- Reported OAuth redirect problems with some providers.

**App:**
- Next.js 16 App Router, hosted on Vercel, deployed when a PR merges to `main`. Read `node_modules/next/dist/docs/` before writing route code, as the repo's AGENTS.md requires.
- Supabase with RLS. The app only ever uses the anon key plus the user's own login, and `workouts`, `cycles` and `workout_coach_notes` are admin-only for writes.
- No new Vercel environment variables. Jake can't set them.
- SQL migrations are numbered files (`supabase/migration-0NN-*.sql`) that Jake runs by hand in the Supabase SQL editor. He runs them before merging, because merging means live. `scripts/test-db.mjs` loads each migration and checks RLS, and it runs in `npm run build`.

## Decisions

**Where it lives (decided with Jake):** a route inside the existing Next.js app, e.g. `https://<app domain>/api/mcp`. It ships through the normal PR flow. The Supabase Edge Function option was dropped because it would mean keeping a second copy of the validation rules.

**Who can use it (decided):** only admins. Grok acts as the admin who connected it.

**Review flow (decided):** Jake reviews in the Grok chat, and nothing is saved until he tells Grok to push. A push may publish days right away.

**Scope (decided):** everything under Goals, with members left out.

**Sign-in (my call):** use Supabase Auth's OAuth 2.1 server, which supports dynamic client registration for MCP clients. Grok sends Jake to sign in with his normal app account and approve access, and the MCP route gets a Supabase access token. The route:
- returns 401 with a `WWW-Authenticate` header that points to `/.well-known/oauth-protected-resource`, which names the Supabase project as the authorization server
- checks the bearer token and builds a Supabase client that carries it, so every query runs under the existing RLS as that user
- refuses anyone whose profile isn't `approved` and `is_admin`

Two parts of this are Supabase-side setup:
- The app hosts the OAuth consent page that Supabase redirects to, e.g. `/oauth/consent`, where the signed-in user approves "Grok wants to edit programming."
- Jake turns on the OAuth server and dynamic registration in the Supabase dashboard and sets that consent path. He has Supabase access.

`src/proxy.ts` currently redirects every signed-out request to `/login`. Its matcher must let `/api/mcp` and `/.well-known/*` through untouched.

**Preview and push are stored, not trusted from the chat (my call):** a preview saves the proposed change set in a new table and returns its id. Push takes only that id, so whatever gets pushed is exactly what Grok previewed. Grok can't send a different payload at push time.

**Stale check (my call):** a preview records each affected row's `updated_at`. Push refuses if any of those rows changed afterward, for example because Jake edited the day in the builder, and lists the days that changed. Grok then previews again.

**Undo (my call):** each push saves the "before" version of every row it touched. Undo puts those back in one transaction, which recreates deleted days, notes and cycles and removes created ones. It refuses if a row changed after the push. Grok can undo any earlier push by id; "undo that" means the latest push. A push that has been undone can't be undone again.

**All-or-nothing (my call):** supabase-js can't run multi-statement transactions. Push and undo therefore each call one Postgres function that runs as the calling user (`security invoker`), so RLS still applies and everything commits or nothing does.

**Future only (decided with Jake):** every day write (`put_day`, `delete_day`, `put_coach_notes`) must be for a date after today in America/Halifax. Today and earlier are read-only through MCP. Future days have no comments, attendance or lift logs, so deleting one and undoing it loses nothing members made. If a future day somehow does have comments, the preview lists that as an error for that day. The same rule applies again at push time and at undo time: undo refuses any day that is no longer in the future.

For cycles (my call):
- A cycle can be created only if it starts after today.
- A cycle that has already started can still be edited (name, why, brief, goals, weeks, days), but its `start_date` can't change.
- Only cycles that haven't started can be deleted.
- Deleting a cycle never touches its workout days, which matches `deleteCycle` today.

**Validation (my call):** before a preview is stored, the change set goes through the same rules the builder and planner use:
- `cleanParts` and the title, focus and why limits from `saveWorkout`
- `cleanCoachNotes`
- `cleanPlan`, which checks the Monday start, 3–12 weeks, and movements

`cleanParts` currently sits privately in `src/app/actions.ts`. Move it to `src/lib/` so the server actions and the MCP route share one copy. Also, unlike the builder, check that any `lift.movement` is in the `movements` table and any `gentleMovement` is in `gentleChoices(movements)` (the planner's rule; Goblet squat and friends were deliberately taken out of `movements` but are still valid gentle lifts). Grok is more likely than a person to invent a lift name.

A preview with errors is stored as not pushable, and it returns every problem, each tied to its date or cycle. That way Grok can fix them all in one pass. Silent trimming the builder does (for example cutting text at 1500 chars) should be reported as a warning, not done quietly.

Dates outside the future-only rule are errors.

**Status of days (my call):**
- An edited day keeps its current status unless the change says otherwise.
- A new day is `published` unless the change says `draft`.
- The preview shows the status.

**After a push or undo:** revalidate the same paths the server actions do (`/`, `/workouts`, `/workouts/[date]`, `/admin`, and the layout for cycle changes). Members then see the change on their next load.

## Tools (shape, names are the builder's call)

All dates are `YYYY-MM-DD` in the app's time zone (America/Halifax).

| Tool | Does | Writes? |
|---|---|---|
| `list_cycles` | All cycles: id, name, dates, goals, and a week summary | no |
| `get_cycle` | One cycle in full, including weeks and the weekday plan | no |
| `get_days` | Workout days from `from` to `to` (capped, e.g. 70 days): parts, levels, lifts, status, coach notes, and which cycle covers each day | no |
| `list_movements` | Movement names lifts can use | no |
| `preview_changes` | Takes a list of changes, validates them, stores them, and returns a change-set id, a before/after summary for each item, and any errors and warnings | stores the preview only |
| `push_changes` | Applies a stored, error-free, still-fresh preview | yes |
| `undo_push` | Reverses a push (the latest one if no id is given) | yes |
| `list_pushes` | Recent pushes: when, a summary, and whether undone | no |

Change kinds in `preview_changes`:
- `put_day`: the full day (title, focus, why, parts, status, and optionally coach_notes)
- `delete_day`
- `put_coach_notes`, where empty text clears the notes
- `create_cycle` / `update_cycle`: a full plan in `PlanDraft` shape
- `delete_cycle`

Whole-object writes keep this simple. Grok reads the day, edits it, and sends it back.

The preview output is the part Jake actually reads. Each day should show what changed, compactly: which parts and levels changed, old text next to new. A 20-day change should still fit in a chat reply. Tool descriptions should tell Grok to show the preview to Jake and wait for an explicit "push."

## Data

One new migration, `migration-010-mcp.sql`:
- A table for change sets with these columns:
  - id
  - created_by
  - created_at
  - status: preview, pushed, undone or invalid
  - the validated changes (jsonb)
  - the `updated_at` values seen at preview time
  - the "before" rows captured at push time
  - pushed_at and undone_at
- RLS on that table: admins only, for both reading and writing.
- The push and undo functions (`security invoker`).
- Extend `scripts/test-db.mjs` to load the migration. Test that:
  - a non-admin can't read the table or call the functions
  - push and undo are all-or-nothing
  - the stale check and undo-conflict rules hold
  - today and past days can't be written by push or undo (enforce this in the functions too, not only in the route)

## Rollout order

1. **Connection spike first.** Build the OAuth setup, the consent page and a `/api/mcp` with one read-only tool (`list_cycles`). Ship it, add it to Grok as a custom connector, and confirm Grok can sign in and call the tool. Grok's MCP support is only documented by third parties, and Supabase's OAuth server is in beta, so this is the riskiest part. If it fails, stop and rethink before building the rest.
2. Read tools.
3. Migration, then preview, push, undo and list_pushes, with tests.
4. Short setup notes in `docs/programming/README.md`: Supabase dashboard settings, the Grok connector URL, and how to revoke access.

## Left to the builder

- MCP library choice: the official TypeScript SDK or a Next.js adapter. It must work stateless on Vercel serverless and tolerate a missing `MCP-Protocol-Version` header.
- Exact tool names, input schemas and the diff format, within the shape above.
- Change-set expiry. Something like 24 hours for unpushed previews is fine.
- Caps on how many changes one preview can hold. It should comfortably cover a 12-week cycle (60 days).
- How the consent page looks. Use the app's existing UI patterns.
