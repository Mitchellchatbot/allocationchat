-- Add apikey header to run-scheduled-extraction cron job
-- Without it the Supabase gateway returns 401 before the function code even runs
SELECT cron.unschedule('run-scheduled-extraction');

SELECT cron.schedule(
  'run-scheduled-extraction',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://qnafaecxrokafizyozpx.supabase.co/functions/v1/run-scheduled-extraction',
    headers := '{"Content-Type": "application/json", "apikey": "sb_publishable_EN4ugxUcJl4BgCqiFpLGPw_2sVInkx_"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);
