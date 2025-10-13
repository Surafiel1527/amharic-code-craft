-- Create generation_quality_metrics table for tracking quality checks
CREATE TABLE IF NOT EXISTS public.generation_quality_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id),
  user_id UUID NOT NULL,
  framework TEXT NOT NULL,
  quality_score INTEGER NOT NULL,
  passed BOOLEAN NOT NULL,
  issues_found JSONB DEFAULT '[]'::jsonb,
  files_generated INTEGER NOT NULL,
  required_files_missing TEXT[],
  optional_files_missing TEXT[],
  healing_applied BOOLEAN DEFAULT false,
  files_added_by_healing TEXT[],
  quality_score_after_healing INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.generation_quality_metrics ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own quality metrics
CREATE POLICY "Users can view own quality metrics"
  ON public.generation_quality_metrics
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: System can insert quality metrics
CREATE POLICY "System can insert quality metrics"
  ON public.generation_quality_metrics
  FOR INSERT
  WITH CHECK (true);

-- Policy: Admins can view all quality metrics
CREATE POLICY "Admins can view all quality metrics"
  ON public.generation_quality_metrics
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Create index for faster queries
CREATE INDEX idx_quality_metrics_framework ON public.generation_quality_metrics(framework);
CREATE INDEX idx_quality_metrics_quality_score ON public.generation_quality_metrics(quality_score);
CREATE INDEX idx_quality_metrics_user_created ON public.generation_quality_metrics(user_id, created_at DESC);

-- Create view for quality analytics
CREATE OR REPLACE VIEW public.quality_analytics AS
SELECT 
  framework,
  COUNT(*) as total_generations,
  AVG(quality_score) as avg_quality_score,
  COUNT(*) FILTER (WHERE passed = true) as passed_count,
  COUNT(*) FILTER (WHERE healing_applied = true) as healed_count,
  AVG(quality_score_after_healing - quality_score) FILTER (WHERE healing_applied = true) as avg_healing_improvement
FROM public.generation_quality_metrics
GROUP BY framework;