-- Speed: RLS policies call is_approved() / is_admin() once per query instead
-- of once per row. Wrapping a function in (select ...) lets Postgres run it
-- once and reuse the answer. Same rules as before, nothing else changes.
-- Also indexes messages.lift_log_id, used when a lift log is deleted (cascade)
-- and when chat loads cheers through it.

create index if not exists messages_lift_log_id_idx on public.messages (lift_log_id) where lift_log_id is not null;

alter policy "see crew" on public.profiles using (id = auth.uid() or (select public.is_approved()));
alter policy "read program" on public.program using ((select public.is_approved()));
alter policy "admins edit program" on public.program using ((select public.is_admin())) with check ((select public.is_admin()));
alter policy "read workouts" on public.workouts using ((select public.is_approved()) and (status = 'published' or (select public.is_admin())));
alter policy "admins add workouts" on public.workouts with check ((select public.is_admin()));
alter policy "admins edit workouts" on public.workouts using ((select public.is_admin())) with check ((select public.is_admin()));
alter policy "admins delete workouts" on public.workouts using ((select public.is_admin()));
alter policy "read comments" on public.comments using ((select public.is_approved()));
alter policy "add comments" on public.comments with check (user_id = auth.uid() and (select public.is_approved()));
alter policy "delete comments" on public.comments using (user_id = auth.uid() or (select public.is_admin()));
alter policy "read attendance" on public.attendance using ((select public.is_approved()));
alter policy "check in" on public.attendance with check (user_id = auth.uid() and (select public.is_approved()));
alter policy "read movements" on public.movements using ((select public.is_approved()));
alter policy "admins add movements" on public.movements with check ((select public.is_admin()));
alter policy "read lifts" on public.lift_logs using ((select public.is_approved()));
alter policy "log lifts" on public.lift_logs with check (user_id = auth.uid() and (select public.is_approved()));
alter policy "read chat" on public.messages using ((select public.is_approved()));
alter policy "post chat" on public.messages with check (user_id = auth.uid() and kind = 'text' and lift_log_id is null and (select public.is_approved()));
alter policy "delete own chat" on public.messages using (user_id = auth.uid() or (select public.is_admin()));
alter policy "read cheers" on public.cheers using ((select public.is_approved()));
alter policy "cheer" on public.cheers with check (user_id = auth.uid() and (select public.is_approved()));
alter policy "read recaps" on public.weekly_recaps using ((select public.is_approved()));
alter policy "log own ai use" on public.ai_requests with check (user_id = auth.uid() and (select public.is_approved()));
alter policy "read cycles" on public.cycles using ((select public.is_approved()));
alter policy "admins add cycles" on public.cycles with check ((select public.is_admin()));
alter policy "admins edit cycles" on public.cycles using ((select public.is_admin())) with check ((select public.is_admin()));
alter policy "admins delete cycles" on public.cycles using ((select public.is_admin()));
alter policy "read avatars" on public.avatars using ((select public.is_approved()));
alter policy "admins read coach notes" on public.workout_coach_notes using ((select public.is_admin()));
alter policy "admins add coach notes" on public.workout_coach_notes with check ((select public.is_admin()));
alter policy "admins edit coach notes" on public.workout_coach_notes using ((select public.is_admin())) with check ((select public.is_admin()));
alter policy "admins delete coach notes" on public.workout_coach_notes using ((select public.is_admin()));
