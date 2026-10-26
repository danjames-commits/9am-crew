Programming documents (non-data files)

## Coach notes

A program's `coach_notes` (from each workout in the program JSON) go into `public.workout_coach_notes`, which is admin-only.

- Load them with an upsert, one per workout date:

  ```sql
  insert into public.workout_coach_notes (class_date, body) values ('2026-10-26', '…')
  on conflict (class_date) do update set body = excluded.body, updated_at = now();
  ```

- Empty notes are skipped. Do not write a blank row.
- Clean each note the same way the app does before inserting: `\r\n` to `\n`, trim, at most 2000 characters, skip if empty. A note over 2000 characters makes the whole SQL batch fail.
- Run the insert after the workout row for the same date is written. The notes table references `workouts.class_date`, so the insert fails if the workout is missing.

## Loading Court6 Cycle 1

The member-facing text is the short version: the full coaching detail (RPE targets, scaling for masters and newer lifters, load formulas, pace aims, no-machine swaps) lives in each day's coach notes. The original long-form text is in git history (PR #4).

`supabase/cycle1.py` turns `court6-cycle1-app.json` into two files you paste into the Supabase SQL editor:

- `supabase/cycle1.sql` adds the cycle (Oct 19 – Dec 18), upserts all 45 workouts as published (Week 1 replaces the `week1.sql` version), and adds each day's coach note. It runs as one transaction and is safe to run again: it updates the cycle and overwrites those days in place (comments stay). If a different cycle covers those weeks, it fails and changes nothing.
- `supabase/cycle1-undo.sql` removes it again: the cycle row, the coach notes and the Oct 26 – Dec 18 workouts, and it puts the original Week 1 back. Deleting a workout also deletes its comments. Attendance and lift logs are kept.

Only run it once the program is approved and the cycle-card fix (test week + 90% deload cap) is merged.

To regenerate after editing the JSON:

```bash
python3 supabase/cycle1.py
```

The script checks the program first (4 versions per part, allowed part and week kinds, lifts in the movements list, 45 weekdays inside the 9 weeks) and writes nothing if a check fails. The movements list is the seeded one; if admins have added movements in the app, add them to `MOVEMENTS` in the script.

## Grok connector

Grok connects to the app at `https://9amcrew.ca/api/mcp` and signs in through Supabase's OAuth server. Only admins can allow it.

- Supabase dashboard → Authentication → OAuth Server: turn it on, turn on dynamic client registration, and set the authorization path to `/oauth/consent`.
- Grok: add a custom connector with the URL `https://9amcrew.ca/api/mcp`, then sign in when asked and tap Allow.
- To revoke access: Supabase dashboard → OAuth apps, or remove the connector in Grok.
