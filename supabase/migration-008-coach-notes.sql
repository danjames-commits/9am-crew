-- Private coach notes, one per workout day. Only admins can read or write
-- them; members get no rows. Deleting a workout deletes its note.

create table if not exists public.workout_coach_notes (
  class_date date primary key references public.workouts (class_date) on delete cascade on update cascade,
  body text not null check (char_length(body) between 1 and 2000),
  updated_at timestamptz not null default now()
);

alter table public.workout_coach_notes enable row level security;

drop policy if exists "admins read coach notes" on public.workout_coach_notes;
create policy "admins read coach notes" on public.workout_coach_notes for select to authenticated using (public.is_admin());
drop policy if exists "admins add coach notes" on public.workout_coach_notes;
create policy "admins add coach notes" on public.workout_coach_notes for insert to authenticated with check (public.is_admin());
drop policy if exists "admins edit coach notes" on public.workout_coach_notes;
create policy "admins edit coach notes" on public.workout_coach_notes for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins delete coach notes" on public.workout_coach_notes;
create policy "admins delete coach notes" on public.workout_coach_notes for delete to authenticated using (public.is_admin());
