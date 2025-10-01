-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the improvement function to run weekly (every Sunday at 2 AM)
SELECT cron.schedule(
  'weekly-ai-improvement',
  '0 2 * * 0',
  $$
  SELECT
    net.http_post(
        url:='https://xuncvfnvatgqshlivuep.supabase.co/functions/v1/scheduled-improvement',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1bmN2Zm52YXRncXNobGl2dWVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMzcxNjIsImV4cCI6MjA3NDgxMzE2Mn0.NSXCzJBFSOLlUUErIjKqLv3-8drmvbSfat8Bf_ewu6o"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);