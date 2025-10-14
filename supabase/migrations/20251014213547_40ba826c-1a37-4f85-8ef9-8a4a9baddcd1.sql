-- Phase 3: Multi-Model Orchestration Tables

-- Table for tracking model performance
CREATE TABLE IF NOT EXISTS public.model_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL,
  model_name TEXT NOT NULL,
  approach TEXT NOT NULL,
  quality_score INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  request_complexity INTEGER,
  file_count INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Table for model selection decisions
CREATE TABLE IF NOT EXISTS public.model_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL,
  task_profile JSONB NOT NULL,
  selected_model TEXT NOT NULL,
  alternative_models TEXT[],
  selection_reasoning TEXT,
  quality_score INTEGER,
  was_optimal BOOLEAN
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_model_performance_user_model 
ON public.model_performance(user_id, model_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_model_performance_quality 
ON public.model_performance(quality_score DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_model_selections_user 
ON public.model_selections(user_id, created_at DESC);

-- RLS Policies
ALTER TABLE public.model_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_selections ENABLE ROW LEVEL SECURITY;

-- Users can view their own performance data
CREATE POLICY "Users can view own model performance"
ON public.model_performance FOR SELECT
USING (auth.uid() = user_id);

-- System can insert performance data
CREATE POLICY "System can insert model performance"
ON public.model_performance FOR INSERT
WITH CHECK (true);

-- Users can view their own selections
CREATE POLICY "Users can view own model selections"
ON public.model_selections FOR SELECT
USING (auth.uid() = user_id);

-- System can insert selections
CREATE POLICY "System can insert model selections"
ON public.model_selections FOR INSERT
WITH CHECK (true);

-- Function to get best performing model for a task type
CREATE OR REPLACE FUNCTION public.get_best_model_for_task(
  p_user_id UUID,
  p_task_type TEXT,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE(
  model_name TEXT,
  avg_quality_score NUMERIC,
  avg_duration_ms NUMERIC,
  success_rate NUMERIC,
  total_uses BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mp.model_name,
    ROUND(AVG(mp.quality_score)::NUMERIC, 2) as avg_quality_score,
    ROUND(AVG(mp.duration_ms)::NUMERIC, 0) as avg_duration_ms,
    ROUND((COUNT(*) FILTER (WHERE mp.success = true)::NUMERIC / COUNT(*) * 100), 2) as success_rate,
    COUNT(*) as total_uses
  FROM public.model_performance mp
  WHERE mp.user_id = p_user_id
    AND mp.created_at > now() - interval '30 days'
  GROUP BY mp.model_name
  HAVING COUNT(*) >= 3
  ORDER BY avg_quality_score DESC, success_rate DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;