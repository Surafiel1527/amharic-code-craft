-- Comprehensive Security Fix for All Reported Issues
-- This migration addresses: API Keys exposure, User Analytics data exposure

-- ============================================================================
-- FIX 1: Secure API Keys Table
-- Issue: "API Keys Could Be Exposed to Unauthorized Users"
-- ============================================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can manage their own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can view their own API keys" ON public.api_keys;

-- Ensure RLS is enabled
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view ONLY their own API keys
CREATE POLICY "Users can view their own API keys"
ON public.api_keys
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy 2: Users can insert their own API keys
CREATE POLICY "Users can insert their own API keys"
ON public.api_keys
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy 3: Users can update their own API keys
CREATE POLICY "Users can update their own API keys"
ON public.api_keys
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy 4: Users can delete their own API keys
CREATE POLICY "Users can delete their own API keys"
ON public.api_keys
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all API keys
CREATE POLICY "Admins can view all API keys"
ON public.api_keys
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Add comment
COMMENT ON TABLE public.api_keys IS 'User-generated API keys with RLS protecting access to own keys only';

-- ============================================================================
-- FIX 2: Secure generation_analytics Table  
-- Issue: "User Behavior Data Could Be Accessed by Competitors"
-- ============================================================================

-- Drop existing policies if insufficient
DROP POLICY IF EXISTS "Users can insert their own analytics" ON public.generation_analytics;
DROP POLICY IF EXISTS "Users can view their own analytics" ON public.generation_analytics;
DROP POLICY IF EXISTS "Admins can view all analytics" ON public.generation_analytics;
DROP POLICY IF EXISTS "Users can update their own analytics" ON public.generation_analytics;

-- Ensure RLS is enabled
ALTER TABLE public.generation_analytics ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can ONLY view their own analytics
CREATE POLICY "Users can view only their own analytics"
ON public.generation_analytics
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- Policy 2: Users can insert their own analytics
CREATE POLICY "Users can insert their own analytics"
ON public.generation_analytics
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy 3: Users can update their own analytics
CREATE POLICY "Users can update only their own analytics"
ON public.generation_analytics
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy 4: Prevent deletion by regular users (audit trail)
CREATE POLICY "Only admins can delete analytics"
ON public.generation_analytics
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_generation_analytics_user_id ON public.generation_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_generation_analytics_created_at ON public.generation_analytics(created_at DESC);

-- Add comment
COMMENT ON TABLE public.generation_analytics IS 'User behavior analytics with strict RLS. Users can only access their own data. Admins have full access.';

-- ============================================================================
-- FIX 3: Review and Secure Other Sensitive Tables
-- ============================================================================

-- Ensure detected_errors is secure
ALTER TABLE public.detected_errors ENABLE ROW LEVEL SECURITY;

-- Ensure system_health is admin-only
ALTER TABLE public.system_health ENABLE ROW LEVEL SECURITY;

-- Ensure ai_improvements is properly secured
ALTER TABLE public.ai_improvements ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SUMMARY: Create security audit log
-- ============================================================================

-- Notify admins about security hardening
SELECT public.notify_admins(
  'security',
  'Comprehensive Security Hardening Applied',
  'Applied RLS policies to api_keys and generation_analytics tables. User data now protected from unauthorized access.',
  jsonb_build_object(
    'tables_secured', ARRAY['api_keys', 'generation_analytics', 'detected_errors', 'system_health', 'ai_improvements'],
    'policies_added', 9,
    'security_level', 'hardened'
  )
);