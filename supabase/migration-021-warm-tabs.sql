-- Migration 021: the keep-warm pings now open the tabs themselves (?warm=1), so the
-- code behind the Today page and the other tabs is already loaded when someone opens
-- the app. Today gets its own ping; the other tabs are pinged two minutes later so
-- the pings don't compete with each other.
select cron.unschedule('keep-warm') where exists (select 1 from cron.job where jobname = 'keep-warm');
select cron.unschedule('keep-warm-tabs') where exists (select 1 from cron.job where jobname = 'keep-warm-tabs');
select cron.schedule('keep-warm', '*/4 9-23,0-3 * * *', $$
  select net.http_get('https://9amcrew.ca/?warm=1');
$$);
select cron.schedule('keep-warm-tabs', '2-58/4 9-23,0-3 * * *', $$
  select net.http_get('https://9amcrew.ca/chat?warm=1');
  select net.http_get('https://9amcrew.ca/workouts?warm=1');
  select net.http_get('https://9amcrew.ca/lifts?warm=1');
  select net.http_get('https://9amcrew.ca/me?warm=1');
  select net.http_get('https://9amcrew.ca/login');
$$);
