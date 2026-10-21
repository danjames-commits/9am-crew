-- Migration 016: keep the app's server warm from about 6 AM to midnight Halifax time,
-- so opening 9amcrew.ca doesn't wait on a cold start. Uses Supabase's built-in
-- scheduler (pg_cron) and web requests (pg_net). Replaces the GitHub Actions ping,
-- whose schedule GitHub doesn't reliably run.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.unschedule('keep-warm') where exists (select 1 from cron.job where jobname = 'keep-warm');
select cron.schedule(
  'keep-warm',
  '*/4 9-23,0-3 * * *',
  $$
    select net.http_get('https://9amcrew.ca/api/warm');
    select net.http_get('https://9amcrew.ca/login');
  $$
);
