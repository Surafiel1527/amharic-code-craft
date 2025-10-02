
-- ============================================================================
-- FIX: Remove Security Definer View and Replace with Secure Function
-- ============================================================================

-- Drop the security definer view
DROP VIEW IF EXISTS admin_privacy_audit;

-- Create a secure function instead that respects RLS
CREATE OR REPLACE FUNCTION public.get_privacy_audit()
RETURNS TABLE (
  table_name text,
  private_count bigint,
  public_count bigint,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can access privacy audit
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: Only administrators can view privacy audit';
  END IF;

  RETURN QUERY
  SELECT 
    'projects'::text as table_name,
    COUNT(*) FILTER (WHERE is_public = false) as private_count,
    COUNT(*) FILTER (WHERE is_public = true) as public_count,
    COUNT(*) as total_count
  FROM projects
  UNION ALL
  SELECT 
    'conversations'::text as table_name,
    COUNT(*) as private_count,
    0::bigint as public_count,
    COUNT(*) as total_count
  FROM conversations
  UNION ALL
  SELECT 
    'generated_images'::text as table_name,
    COUNT(*) as private_count,
    0::bigint as public_count,
    COUNT(*) as total_count
  FROM generated_images;
END;
$$;

COMMENT ON FUNCTION public.get_privacy_audit IS 
  'Secure function for admins to view privacy statistics. Replaces the potentially unsafe security definer view.';
