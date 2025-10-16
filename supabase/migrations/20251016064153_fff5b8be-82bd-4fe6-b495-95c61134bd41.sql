-- ============================================
-- ENTERPRISE SECURITY: PROJECT-SCOPED ACCESS CONTROL
-- ============================================
-- This migration implements comprehensive project ownership validation
-- and ensures users can only access their own projects and conversations

-- 1. Enable RLS on projects table (if not already enabled)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- 2. Create strict project ownership policies
DROP POLICY IF EXISTS "Users can only access own projects" ON public.projects;
CREATE POLICY "Users can only access own projects"
ON public.projects
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. Ensure conversations are bound to user's projects
DROP POLICY IF EXISTS "Users can manage their own conversations" ON public.conversations;
CREATE POLICY "Users can manage their own conversations"
ON public.conversations
FOR ALL
USING (
  auth.uid() = user_id AND
  (
    project_id IS NULL OR 
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = conversations.project_id 
      AND projects.user_id = auth.uid()
    )
  )
)
WITH CHECK (
  auth.uid() = user_id AND
  (
    project_id IS NULL OR 
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = conversations.project_id 
      AND projects.user_id = auth.uid()
    )
  )
);

-- 4. Create security audit log table
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  event_type TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  attempted_action TEXT NOT NULL,
  success BOOLEAN NOT NULL DEFAULT false,
  ip_address TEXT,
  user_agent TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view security audit logs
CREATE POLICY "Admins can view security audit logs"
ON public.security_audit_log
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- System can insert audit logs (using service role)
CREATE POLICY "System can insert security audit logs"
ON public.security_audit_log
FOR INSERT
WITH CHECK (true);

-- 5. Create index for fast audit log queries
CREATE INDEX IF NOT EXISTS idx_security_audit_user_id 
ON public.security_audit_log(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_audit_event_type 
ON public.security_audit_log(event_type, created_at DESC);

-- 6. Create helper function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_user_id UUID,
  p_event_type TEXT,
  p_resource_type TEXT,
  p_resource_id UUID,
  p_attempted_action TEXT,
  p_success BOOLEAN,
  p_error_message TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.security_audit_log (
    user_id,
    event_type,
    resource_type,
    resource_id,
    attempted_action,
    success,
    error_message,
    metadata
  ) VALUES (
    p_user_id,
    p_event_type,
    p_resource_type,
    p_resource_id,
    p_attempted_action,
    p_success,
    p_error_message,
    p_metadata
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- 7. Add trigger to prevent conversation project_id changes
CREATE OR REPLACE FUNCTION public.prevent_conversation_project_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Once a conversation is bound to a project, it cannot be changed
  IF OLD.project_id IS NOT NULL AND NEW.project_id IS DISTINCT FROM OLD.project_id THEN
    RAISE EXCEPTION 'Cannot change project_id of an existing conversation. Once bound, conversations are immutable to their project.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_conversation_project_change ON public.conversations;
CREATE TRIGGER prevent_conversation_project_change
BEFORE UPDATE ON public.conversations
FOR EACH ROW
EXECUTE FUNCTION public.prevent_conversation_project_change();

COMMENT ON TABLE public.security_audit_log IS 'Enterprise security audit log for tracking all access attempts and security events';
COMMENT ON FUNCTION public.log_security_event IS 'Helper function to log security events with standardized format';