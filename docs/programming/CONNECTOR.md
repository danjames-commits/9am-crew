# 9am Crew connector: tools, data shape and workflow

How Claude (or Grok) reads and edits Court6 programming through the app's MCP connector. Setup and permissions are in [README.md](README.md#grok-connector).

- **URL:** `https://9amcrew.ca/api/mcp`
- **Sign-in:** OAuth as an app admin.
- **In Claude:** add it in claude.ai → Settings → Connectors → Add custom connector.

Always re-read live data before editing. These notes describe the shape of the data, not its current contents. The rules every change has to follow are in [RULES.md](RULES.md).

Last updated: Nov 22, 2026.

## Tools

| Tool | What it does |
|---|---|
| `list_cycles` | All cycles, with goals and a one-line summary of each week |
| `get_cycle` | One cycle in full, including the per-weekday plan (`days`) |
| `get_days` | The workout for each class day (Mon–Fri) in a date range, inclusive, empty days included. At most 70 days. |
| `list_movements` | The lifts the gym tracks (`lifts`) |
| `preview_changes` | Checks a batch and saves it as a preview. **Nothing changes in the app.** Show Jake the returned preview text and wait. |
| `push_changes` | Applies a preview, all or nothing. **Only when Jake says "push".** |
| `undo_push` | Reverses the latest push, or one by id. It refuses if a changed day was edited since. **Only when Jake says "undo that".** |
| `list_pushes` | Recent pushes and previews, newest first |

- **Previews:** expire after 24 hours.
- **Size:** a full-cycle `get_days` is about 225,000 characters, too big to show inline. Save it to a file and read it from there.

## Day object (`get_days`)

One element per weekday:

- `date` (YYYY-MM-DD), `weekday`, `exists`, `editable`
- `editable`: true for today and later (Halifax time).
  - Today can change only until a member comments, answers the survey, logs a lift or logs a benchmark. Sign-ups don't count.
  - Today can't be deleted. Past days are read-only.
- `cycle`: `{ id, name }`, or `null` if no cycle covers the day.
- `title` (50 characters or fewer is the house style), `focus`, `why`: member-facing day metadata.
- `status`: `draft` or `published`.
- `parts`: ordered list of class blocks (below).
- `coach_notes`: free text, admin-only, at most 2,000 characters.
  - Leave `coach_notes` out of a `put_day` to keep the existing notes. Send `""` to clear them.
- `updated_at`

### Parts

- `kind`: `warmup` | `strength` | `skill` | `conditioning` | `cooldown`.
- `label`: the block name shown to members, e.g. `Warm-up`, `Strength`, `Strength · top sets`, `Skill`, `Accessory`, `Test`, `Conditioning`, `Cool-down`.
  - Accessory work is `kind: skill` with `label: "Accessory"`. The Thursday rule (conditioning before accessories) looks for that label.
- `title`, `minutes`.
- `versions`: **exactly 3 strings**, in this order: Steady, Strong, Full. There is no Gentle level (migration 035).
- `lift` (optional, on strength parts): `{ movement, pct: [3 values], mode, note, reps, sets }`.
  - `movement` must come from `list_movements`.
  - `pct` values are null on test and build-to-heavy days, otherwise in steps of 5.
- `benchmark` (optional): the benchmark name, used for score logging and the named-workout check.
- `outdoor` (optional, on conditioning): `{ title, versions: [Steady, Strong, Full], benchmark? }`.
  - Inside (`versions`) = machines, no running. Outside (`outdoor.versions`) = running.
  - The two sides mirror each other and are time-matched (see RULES.md).

### Text style

- Members see each version as written. New lines are kept.
- Use `" · "` to separate items on one line, and an optional `"Label: "` line heading.

## Cycle object (`get_cycle`)

- `id`, `name`, `start_date` (a Monday), `end_date`, `week_count`.
- `why`, `brief`, `goals[]`.
- `weeks[]`: `{ pct, kind, reps, sets, label }`. `kind` is `test`, `build` or `deload`; a retest week is `kind: test` with label `Retest`.
- `days`: keyed `"1"` (Monday) to `"5"` (Friday), each `{ lift, focus, notes, skill, style }`.
- A started cycle can be edited but not moved or deleted. A new cycle must start after today. Cycles run back to back.

## Preview and push workflow

1. **Read fresh** with `get_days` or `get_cycle`. Never edit from memory or from the repo files.
2. **Send whole days back** (and whole cycle plans). Don't patch a single part on its own.
3. **Change kinds** (at most 100 per batch, one clear job per batch):
   - `put_day`: `{ kind, date, title, parts, focus?, why?, status?, coach_notes? }`. `date` is a weekday, today or later.
   - `delete_day` (not today)
   - `put_coach_notes`
   - `create_cycle` / `update_cycle` / `delete_cycle`
4. **The preview runs the programming checks** in `src/lib/programming/rules.ts`:
   - ✗ problems block the push. Fix every one and preview again.
   - ⚠ warnings are shown so Jake can decide.
   - The preview also warns about any movement that repeats within 2 class days of a changed day.
5. **Show Jake** the verbatim preview text, a one-line summary, and a side-by-side of current vs proposed.
6. **Push or undo:** don't call `push_changes` unless Jake says "push". If a push or undo is refused, re-read live data and redo it. Don't add changes he didn't ask for.

## Files in the repo

- **`court6-cycle1-app.json`:** Cycle 1 as `{ cycle, workouts }`, refreshed from live data on Nov 22, 2026.
  - `supabase/cycle1.py` turns it into `supabase/cycle1.sql`. Run it with `python -X utf8 supabase/cycle1.py` on Windows.
  - Only use the SQL to rebuild the cycle from scratch. Day-to-day edits go through the connector.
- **The PDFs:** printable copies of [ROADMAP.md](ROADMAP.md) and the Cycle 1 program.
  - `court6-cycle1-9wk-weekdays.pdf` is the original Oct 16 design document, kept for history.
  - `court6-cycle1-program.pdf` is generated from the live data.
