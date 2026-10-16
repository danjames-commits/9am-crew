-- The crew doesn't log weights for Gentle's easier movements; they stay as
-- workout options but leave the lift list. Adds Snatch and Squat clean & jerk.
-- Only removes a movement nobody has logged.
delete from public.movements m
 where m.name in ('Goblet squat', 'Kettlebell deadlift', 'Dumbbell press', 'Kettlebell swing')
   and not exists (select 1 from public.lift_logs l where l.movement_id = m.id);

insert into public.movements (name, sort) values ('Snatch', 80), ('Squat clean & jerk', 90)
on conflict (name) do nothing;

select name from public.movements order by sort;
