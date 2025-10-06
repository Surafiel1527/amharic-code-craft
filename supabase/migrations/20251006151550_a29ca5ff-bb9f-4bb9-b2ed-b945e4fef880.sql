-- Create user orchestration state table for progress persistence
CREATE TABLE IF NOT EXISTS public.user_orchestration_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  last_request TEXT,
  current_job_id UUID REFERENCES public.ai_generation_jobs(id) ON DELETE SET NULL,
  progress INTEGER DEFAULT 0,
  current_step TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create orchestration metrics table for monitoring
CREATE TABLE IF NOT EXISTS public.orchestration_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  success BOOLEAN NOT NULL DEFAULT false,
  error_type TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_orchestration_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orchestration_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_orchestration_state
CREATE POLICY "Users can manage their orchestration state"
  ON public.user_orchestration_state
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for orchestration_metrics  
CREATE POLICY "Users can view their metrics"
  ON public.orchestration_metrics
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert metrics"
  ON public.orchestration_metrics
  FOR INSERT
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_orchestration_state_user_id 
  ON public.user_orchestration_state(user_id);

CREATE INDEX IF NOT EXISTS idx_user_orchestration_state_job_id 
  ON public.user_orchestration_state(current_job_id);

CREATE INDEX IF NOT EXISTS idx_orchestration_metrics_user_id 
  ON public.orchestration_metrics(user_id);

CREATE INDEX IF NOT EXISTS idx_orchestration_metrics_created_at 
  ON public.orchestration_metrics(created_at DESC);

-- Add cleanup function for old metrics (keep last 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.orchestration_metrics
  WHERE created_at < now() - interval '30 days';
END;
$$;