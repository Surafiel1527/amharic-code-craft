-- Phase 2: Intelligent Cache & User Preferences Tables

-- Routing cache for repeat requests
CREATE TABLE IF NOT EXISTS public.routing_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  request_hash TEXT NOT NULL,
  request_text TEXT NOT NULL,
  route TEXT NOT NULL,
  result JSONB NOT NULL,
  context_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  hit_count INTEGER DEFAULT 0,
  last_accessed TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add user_id to routing_metrics for preference learning
ALTER TABLE public.routing_metrics
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Indexes for cache performance
CREATE INDEX IF NOT EXISTS idx_routing_cache_hash ON public.routing_cache(request_hash, context_hash);
CREATE INDEX IF NOT EXISTS idx_routing_cache_expires ON public.routing_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_routing_cache_user ON public.routing_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_routing_metrics_user_route ON public.routing_metrics(user_id, route);

-- Enable RLS
ALTER TABLE public.routing_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies for routing_cache
CREATE POLICY "Users can view their own cache"
  ON public.routing_cache
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage cache"
  ON public.routing_cache
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Update routing_metrics RLS to include user filtering
DROP POLICY IF EXISTS "Users can view their own metrics" ON public.routing_metrics;

CREATE POLICY "Users can view their own metrics"
  ON public.routing_metrics
  FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Function to get user's route preferences
CREATE OR REPLACE FUNCTION public.get_user_route_preferences(p_user_id UUID)
RETURNS TABLE(
  route TEXT,
  success_count BIGINT,
  total_count BIGINT,
  success_rate NUMERIC,
  avg_duration_ms NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rm.route,
    COUNT(CASE WHEN rm.success THEN 1 END) as success_count,
    COUNT(*) as total_count,
    ROUND((COUNT(CASE WHEN rm.success THEN 1 END)::NUMERIC / COUNT(*) * 100), 2) as success_rate,
    ROUND(AVG(rm.actual_duration_ms)::NUMERIC, 2) as avg_duration_ms
  FROM public.routing_metrics rm
  WHERE rm.user_id = p_user_id
  GROUP BY rm.route
  ORDER BY success_rate DESC, total_count DESC;
END;
$$;

-- Function to get cache statistics
CREATE OR REPLACE FUNCTION public.get_cache_statistics(p_user_id UUID DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_entries', COUNT(*),
    'total_hits', SUM(hit_count),
    'avg_hits_per_entry', ROUND(AVG(hit_count), 2),
    'hit_rate', ROUND((SUM(hit_count)::NUMERIC / NULLIF(COUNT(*), 0) * 100), 2),
    'routes', jsonb_object_agg(
      route,
      jsonb_build_object(
        'count', route_count,
        'hits', route_hits
      )
    )
  ) INTO result
  FROM (
    SELECT 
      route,
      COUNT(*) as route_count,
      SUM(hit_count) as route_hits
    FROM public.routing_cache
    WHERE (p_user_id IS NULL OR user_id = p_user_id)
      AND expires_at > now()
    GROUP BY route
  ) stats;
  
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

COMMENT ON TABLE public.routing_cache IS 'Phase 2: Intelligent caching for routing requests';
COMMENT ON TABLE public.routing_metrics IS 'Enhanced with user_id for preference learning';
COMMENT ON FUNCTION public.get_user_route_preferences IS 'Get routing preferences for a user';
COMMENT ON FUNCTION public.get_cache_statistics IS 'Get cache performance statistics';