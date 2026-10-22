-- Migration 021: the keep-warm ping now also opens each tab (?warm=1), so the code
-- behind the Today page and the other tabs is already loaded when someone opens
-- the app, not just the tiny /api/warm endpoint.
select cron.unschedule('keep-warm') where exists (select 1 from cron.job where jobname = 'keep-warm');
select cron.schedule(
  'keep-warm',
  '*/4 9-23,0-3 * * *',
  $$
    select net.http_get('https://9amcrew.ca/api/warm');
    select net.http_get('https://9amcrew.ca/?warm=1');
    select net.http_get('https://9amcrew.ca/chat?warm=1');
    select net.http_get('https://9amcrew.ca/workouts?warm=1');
    select net.http_get('https://9amcrew.ca/lifts?warm=1');
    select net.http_get('https://9amcrew.ca/me?warm=1');
    select net.http_get('https://9amcrew.ca/login');
  $$
);
