
-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a cron job to process the job queue every minute
SELECT cron.schedule(
  'process-ai-job-queue',
  '* * * * *', -- Every minute
  $$
  SELECT
    net.http_post(
        url:='https://xuncvfnvatgqshlivuep.supabase.co/functions/v1/process-job-queue',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1bmN2Zm52YXRncXNobGl2dWVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMzcxNjIsImV4cCI6MjA3NDgxMzE2Mn0.NSXCzJBFSOLlUUErIjKqLv3-8drmvbSfat8Bf_ewu6o"}'::jsonb,
        body:=concat('{"timestamp": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Add helpful comment
COMMENT ON EXTENSION pg_cron IS 'Job scheduler for PostgreSQL - processes AI generation job queue every minute';
