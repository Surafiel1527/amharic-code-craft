-- ============================================
-- CRITICAL SECURITY FIXES - CORRECTED
-- Priority: URGENT - Fixed to match actual table schemas
-- ============================================

-- 1. CREATE SAFE RPC FUNCTION TO CHECK RLS (Fixes SQL Injection)
CREATE OR REPLACE FUNCTION public.check_rls_enabled(table_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM pg_class
    WHERE relname = table_name
    AND relnamespace = 'public'::regnamespace
    AND relrowsecurity = true
  );
END;
$$;

-- 2. ADD RLS POLICY TO PROFILES TABLE (Fixes Public Data Exposure)
CREATE POLICY "Users can only read own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- 3. SECURE ANALYTICS TABLES THAT HAVE user_id COLUMN
-- First, check which tables actually have user_id and only apply to those

-- Enable RLS on tables with user_id
ALTER TABLE ai_generation_jobs ENABLE ROW LEVEL SECURITY;

-- Add policies for tables with user_id
CREATE POLICY "Users view own AI jobs"
ON ai_generation_jobs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to jobs"
ON ai_generation_jobs FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- For admin-only platform stats, restrict to admin role
ALTER TABLE platform_generation_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view platform stats"
ON platform_generation_stats FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role full access to platform stats"
ON platform_generation_stats FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');