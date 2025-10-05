-- Create table to track long-running AI jobs
CREATE TABLE IF NOT EXISTS public.ai_generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  
  job_type TEXT NOT NULL, -- 'code_generation', 'orchestration', 'multi_file', etc
  status TEXT NOT NULL DEFAULT 'queued', -- 'queued', 'running', 'completed', 'failed'
  
  input_data JSONB NOT NULL DEFAULT '{}',
  output_data JSONB DEFAULT '{}',
  
  progress INTEGER DEFAULT 0, -- 0-100
  current_step TEXT,
  total_steps INTEGER DEFAULT 1,
  completed_steps INTEGER DEFAULT 0,
  
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  error_message TEXT,
  retry_count INTEGER DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.ai_generation_jobs ENABLE ROW LEVEL SECURITY;

-- Users can view their own jobs
CREATE POLICY "Users can view their own jobs"
  ON public.ai_generation_jobs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own jobs
CREATE POLICY "Users can create their own jobs"
  ON public.ai_generation_jobs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- System can update jobs
CREATE POLICY "System can update jobs"
  ON public.ai_generation_jobs
  FOR UPDATE
  USING (true);

-- Add indexes for performance
CREATE INDEX idx_ai_jobs_user_status ON public.ai_generation_jobs(user_id, status);
CREATE INDEX idx_ai_jobs_conversation ON public.ai_generation_jobs(conversation_id);
CREATE INDEX idx_ai_jobs_status ON public.ai_generation_jobs(status);

-- Add realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_generation_jobs;

-- Auto-update timestamp
CREATE TRIGGER update_ai_jobs_updated_at
  BEFORE UPDATE ON public.ai_generation_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();