-- Create context_cache table for intelligent project context caching
CREATE TABLE IF NOT EXISTS public.context_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL UNIQUE,
  project_id UUID,
  user_id UUID,
  route TEXT NOT NULL,
  context_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  hit_count INTEGER DEFAULT 0
);

-- Add index for fast lookups
CREATE INDEX IF NOT EXISTS idx_context_cache_key ON public.context_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_context_cache_expires ON public.context_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_context_cache_project ON public.context_cache(project_id);

-- Enable RLS
ALTER TABLE public.context_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own cached contexts
CREATE POLICY "Users can read own cache" ON public.context_cache
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: System can manage all cache
CREATE POLICY "System can manage cache" ON public.context_cache
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to clean expired cache
CREATE OR REPLACE FUNCTION public.cleanup_expired_context_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.context_cache
  WHERE expires_at < now();
END;
$$;