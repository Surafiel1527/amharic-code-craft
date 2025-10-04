-- Feedback Loop & Performance Optimization Tables

-- Track pattern feedback and acceptance rates
CREATE TABLE IF NOT EXISTS public.pattern_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_id uuid REFERENCES public.cross_project_patterns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  accepted boolean NOT NULL,
  feedback_text text,
  context text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.pattern_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their pattern feedback"
ON public.pattern_feedback
FOR ALL
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_pattern_feedback_pattern 
ON public.pattern_feedback(pattern_id);

CREATE INDEX IF NOT EXISTS idx_pattern_feedback_user 
ON public.pattern_feedback(user_id, created_at DESC);

-- Track model performance for smart selection
CREATE TABLE IF NOT EXISTS public.model_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name text NOT NULL,
  task_type text NOT NULL,
  success boolean NOT NULL,
  execution_time_ms integer,
  quality_score numeric,
  cost_estimate numeric,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.model_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can manage model performance"
ON public.model_performance
FOR ALL
USING (true);

CREATE INDEX IF NOT EXISTS idx_model_performance_model 
ON public.model_performance(model_name, task_type);

CREATE INDEX IF NOT EXISTS idx_model_performance_created 
ON public.model_performance(created_at DESC);

-- Cache for frequently used patterns
CREATE TABLE IF NOT EXISTS public.pattern_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key text NOT NULL UNIQUE,
  pattern_data jsonb NOT NULL,
  hit_count integer DEFAULT 0,
  last_accessed_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.pattern_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can manage pattern cache"
ON public.pattern_cache
FOR ALL
USING (true);

CREATE INDEX IF NOT EXISTS idx_pattern_cache_key 
ON public.pattern_cache(cache_key);

CREATE INDEX IF NOT EXISTS idx_pattern_cache_hits 
ON public.pattern_cache(hit_count DESC, last_accessed_at DESC);

-- Orchestration runs tracking
CREATE TABLE IF NOT EXISTS public.orchestration_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  request text NOT NULL,
  phases_completed jsonb DEFAULT '[]'::jsonb,
  total_duration_ms integer,
  status text DEFAULT 'running',
  results jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone
);

ALTER TABLE public.orchestration_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their orchestration runs"
ON public.orchestration_runs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can manage orchestration runs"
ON public.orchestration_runs
FOR ALL
USING (true);

CREATE INDEX IF NOT EXISTS idx_orchestration_runs_user 
ON public.orchestration_runs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orchestration_runs_conversation 
ON public.orchestration_runs(conversation_id);

COMMENT ON TABLE public.pattern_feedback IS 'Tracks user acceptance/rejection of suggested patterns for learning';
COMMENT ON TABLE public.model_performance IS 'Tracks model performance for intelligent model selection';
COMMENT ON TABLE public.pattern_cache IS 'Caches frequently used patterns for performance';
COMMENT ON TABLE public.orchestration_runs IS 'Tracks end-to-end orchestrated generation runs';