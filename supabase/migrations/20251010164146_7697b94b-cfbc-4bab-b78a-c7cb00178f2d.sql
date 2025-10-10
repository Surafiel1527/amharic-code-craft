-- Platform Storage & Analytics Tables

-- Track storage metrics per generation
CREATE TABLE IF NOT EXISTS public.platform_storage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID,
  conversation_id UUID,
  generation_id UUID,
  total_size_bytes BIGINT NOT NULL DEFAULT 0,
  file_count INTEGER NOT NULL DEFAULT 0,
  largest_file_bytes BIGINT DEFAULT 0,
  largest_file_name TEXT,
  framework TEXT NOT NULL DEFAULT 'react',
  file_breakdown JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track generation statistics
CREATE TABLE IF NOT EXISTS public.platform_generation_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID,
  conversation_id UUID NOT NULL,
  generation_id UUID,
  generation_time_ms INTEGER,
  success BOOLEAN NOT NULL,
  framework TEXT NOT NULL DEFAULT 'react',
  feature_count INTEGER DEFAULT 0,
  total_lines_generated INTEGER DEFAULT 0,
  complexity_score INTEGER DEFAULT 0,
  error_type TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_storage_metrics_user ON public.platform_storage_metrics(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_storage_metrics_project ON public.platform_storage_metrics(project_id);
CREATE INDEX IF NOT EXISTS idx_generation_stats_user ON public.platform_generation_stats(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generation_stats_success ON public.platform_generation_stats(success, created_at DESC);

-- Enable RLS
ALTER TABLE public.platform_storage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_generation_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for storage metrics
CREATE POLICY "Users can view their own storage metrics"
  ON public.platform_storage_metrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert storage metrics"
  ON public.platform_storage_metrics FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all storage metrics"
  ON public.platform_storage_metrics FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for generation stats
CREATE POLICY "Users can view their own generation stats"
  ON public.platform_generation_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert generation stats"
  ON public.platform_generation_stats FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all generation stats"
  ON public.platform_generation_stats FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Function to get user storage summary
CREATE OR REPLACE FUNCTION public.get_user_storage_summary(p_user_id UUID)
RETURNS TABLE (
  total_storage_mb NUMERIC,
  total_projects BIGINT,
  total_files BIGINT,
  avg_generation_size_kb NUMERIC,
  largest_project_mb NUMERIC,
  last_generated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ROUND((SUM(total_size_bytes) / 1024.0 / 1024.0)::numeric, 2) as total_storage_mb,
    COUNT(DISTINCT project_id) as total_projects,
    SUM(file_count) as total_files,
    ROUND((AVG(total_size_bytes) / 1024.0)::numeric, 2) as avg_generation_size_kb,
    ROUND((MAX(total_size_bytes) / 1024.0 / 1024.0)::numeric, 2) as largest_project_mb,
    MAX(created_at) as last_generated_at
  FROM public.platform_storage_metrics
  WHERE user_id = p_user_id;
END;
$$;

-- Function to get platform-wide statistics (admin only)
CREATE OR REPLACE FUNCTION public.get_platform_statistics()
RETURNS TABLE (
  total_users BIGINT,
  total_generations BIGINT,
  success_rate NUMERIC,
  total_storage_gb NUMERIC,
  avg_generation_time_sec NUMERIC,
  total_files_generated BIGINT,
  most_popular_framework TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can access platform statistics
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Only administrators can view platform statistics';
  END IF;

  RETURN QUERY
  SELECT 
    COUNT(DISTINCT gs.user_id) as total_users,
    COUNT(gs.id) as total_generations,
    ROUND((COUNT(CASE WHEN gs.success THEN 1 END)::numeric / NULLIF(COUNT(gs.id), 0) * 100)::numeric, 2) as success_rate,
    ROUND((SUM(sm.total_size_bytes) / 1024.0 / 1024.0 / 1024.0)::numeric, 3) as total_storage_gb,
    ROUND((AVG(gs.generation_time_ms) / 1000.0)::numeric, 2) as avg_generation_time_sec,
    SUM(sm.file_count) as total_files_generated,
    (
      SELECT gs2.framework 
      FROM public.platform_generation_stats gs2 
      GROUP BY gs2.framework 
      ORDER BY COUNT(*) DESC 
      LIMIT 1
    ) as most_popular_framework
  FROM public.platform_generation_stats gs
  LEFT JOIN public.platform_storage_metrics sm ON sm.generation_id = gs.generation_id;
END;
$$;