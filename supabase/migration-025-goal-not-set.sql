-- Migration 025: a weekly goal is only there once someone picks one. Blank means "not
-- set", and only people with a goal appear on the Show-ups board. The 1s everyone got
-- by default become blank (anyone who really meant 1 just picks it again).
alter table public.profiles alter column weekly_goal drop not null;
alter table public.profiles alter column weekly_goal drop default;
update public.profiles set weekly_goal = null where weekly_goal = 1;
