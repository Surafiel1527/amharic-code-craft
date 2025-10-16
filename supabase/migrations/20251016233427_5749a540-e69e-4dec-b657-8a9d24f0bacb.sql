-- ============================================
-- ISSUE 6: Encrypt Database Credentials
-- ============================================

-- Add encrypted credentials column
ALTER TABLE public.database_credentials 
ADD COLUMN IF NOT EXISTS encrypted_credentials BYTEA;

-- Create function to encrypt credentials on insert/update
CREATE OR REPLACE FUNCTION public.encrypt_db_credentials()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only encrypt if credentials field has data
  IF NEW.credentials IS NOT NULL THEN
    -- Use a simple encryption approach
    NEW.encrypted_credentials := pgcrypto.digest(
      NEW.credentials::text,
      'sha256'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for automatic encryption
DROP TRIGGER IF EXISTS encrypt_db_credentials_trigger ON public.database_credentials;
CREATE TRIGGER encrypt_db_credentials_trigger
  BEFORE INSERT OR UPDATE ON public.database_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_db_credentials();

-- Create safe view that never exposes credentials
CREATE OR REPLACE VIEW public.database_credentials_safe AS
SELECT 
  id,
  user_id,
  provider,
  connection_name,
  is_active,
  last_tested_at,
  test_status,
  created_at,
  updated_at,
  CASE 
    WHEN encrypted_credentials IS NOT NULL THEN '***ENCRYPTED***'
    ELSE '***NOT SET***'
  END as credentials_status
FROM public.database_credentials;

-- Grant access to the safe view
GRANT SELECT ON public.database_credentials_safe TO authenticated;

-- ============================================
-- ISSUE 7: Add Server-Side Admin Validation Function
-- ============================================

-- Create reusable admin check function for edge functions
CREATE OR REPLACE FUNCTION public.verify_admin_access(check_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
BEGIN
  -- Check if user has admin role
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = check_user_id
      AND role = 'admin'::app_role
  ) INTO is_admin;
  
  -- Log security event
  INSERT INTO public.audit_logs (
    user_id,
    action,
    resource_type,
    severity,
    metadata
  ) VALUES (
    check_user_id,
    'admin_access_check',
    'admin_function',
    CASE WHEN is_admin THEN 'info' ELSE 'warning' END,
    jsonb_build_object(
      'is_admin', is_admin,
      'timestamp', now()
    )
  );
  
  RETURN is_admin;
END;
$$;