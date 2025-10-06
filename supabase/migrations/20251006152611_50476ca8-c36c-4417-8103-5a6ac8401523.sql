-- Add priority and streaming support to ai_generation_jobs (corrected)
ALTER TABLE public.ai_generation_jobs
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS stream_updates JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS estimated_completion_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS phases JSONB DEFAULT '[]'::jsonb;

-- Create index for priority-based queue ordering
CREATE INDEX IF NOT EXISTS idx_jobs_priority_queue 
ON public.ai_generation_jobs(priority DESC, created_at ASC) 
WHERE status IN ('queued', 'processing');

-- Create index for realtime subscriptions
CREATE INDEX IF NOT EXISTS idx_jobs_realtime 
ON public.ai_generation_jobs(id, status, progress, updated_at);

-- Function to calculate estimated completion time
CREATE OR REPLACE FUNCTION public.calculate_job_eta(p_job_id UUID)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_progress NUMERIC;
  v_elapsed_seconds NUMERIC;
  v_estimated_total_seconds NUMERIC;
  v_created_at TIMESTAMPTZ;
BEGIN
  SELECT progress, created_at INTO v_progress, v_created_at
  FROM public.ai_generation_jobs
  WHERE id = p_job_id;
  
  IF v_progress <= 0 OR v_progress >= 100 THEN
    RETURN NULL;
  END IF;
  
  v_elapsed_seconds := EXTRACT(EPOCH FROM (now() - v_created_at));
  v_estimated_total_seconds := (v_elapsed_seconds / v_progress) * 100;
  
  RETURN v_created_at + (v_estimated_total_seconds || ' seconds')::INTERVAL;
END;
$$;

-- Function to get next job from priority queue
CREATE OR REPLACE FUNCTION public.get_next_queued_job()
RETURNS TABLE(
  job_id UUID,
  request_data JSONB,
  priority INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT id, input_data, aj.priority
  FROM public.ai_generation_jobs aj
  WHERE status = 'queued'
  ORDER BY priority DESC, created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
END;
$$;

COMMENT ON COLUMN public.ai_generation_jobs.priority IS 'Job priority: 1 (lowest) to 10 (highest), default 5';
COMMENT ON COLUMN public.ai_generation_jobs.stream_updates IS 'Streaming updates for real-time progress';
COMMENT ON COLUMN public.ai_generation_jobs.phases IS 'Generation phases with timestamps and status';