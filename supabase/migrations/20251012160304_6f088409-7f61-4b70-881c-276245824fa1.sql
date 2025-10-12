-- Create thinking_steps table to persist AI thinking steps
CREATE TABLE IF NOT EXISTS public.thinking_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.ai_generation_jobs(id) ON DELETE CASCADE,
  project_id UUID,
  operation TEXT NOT NULL,
  detail TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'complete')),
  duration NUMERIC,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_thinking_steps_job_id ON public.thinking_steps(job_id);
CREATE INDEX IF NOT EXISTS idx_thinking_steps_project_id ON public.thinking_steps(project_id);
CREATE INDEX IF NOT EXISTS idx_thinking_steps_timestamp ON public.thinking_steps(timestamp DESC);

-- RLS Policies
ALTER TABLE public.thinking_steps ENABLE ROW LEVEL SECURITY;

-- Users can view thinking steps for their projects
CREATE POLICY "Users can view their thinking steps"
ON public.thinking_steps
FOR SELECT
USING (
  project_id IN (
    SELECT id FROM public.projects WHERE user_id = auth.uid()
  )
);

-- System can insert thinking steps
CREATE POLICY "System can insert thinking steps"
ON public.thinking_steps
FOR INSERT
WITH CHECK (true);

-- Add comment
COMMENT ON TABLE public.thinking_steps IS 'Stores AI thinking steps during generation for permanent display in chat interface';