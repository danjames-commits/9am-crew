Programming documents (non-data files)

## Coach notes

A program's `coach_notes` (from each workout in the program JSON) go into `public.workout_coach_notes`, which is admin-only.

- Load them with an upsert, one per workout date:

  ```sql
  insert into public.workout_coach_notes (class_date, body) values ('2026-10-26', '…')
  on conflict (class_date) do update set body = excluded.body, updated_at = now();
  ```

- Empty notes are skipped. Do not write a blank row.
- Run the insert after the workout row for the same date is written. The notes table references `workouts.class_date`, so the insert fails if the workout is missing.
