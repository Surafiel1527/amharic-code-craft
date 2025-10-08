-- Create pending_confirmations table for confirmation engine
CREATE TABLE IF NOT EXISTS public.pending_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid,
  change_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  preview text NOT NULL,
  proposed_changes jsonb DEFAULT '{}'::jsonb,
  affected_resources jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  approved_at timestamptz,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pending_confirmations ENABLE ROW LEVEL SECURITY;

-- Users can view their own pending confirmations
CREATE POLICY "Users view own confirmations"
  ON public.pending_confirmations FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own pending confirmations
CREATE POLICY "Users update own confirmations"
  ON public.pending_confirmations FOR UPDATE
  USING (auth.uid() = user_id);

-- Create security_events table for security intelligence
CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  table_name text,
  risks_detected integer DEFAULT 0,
  auto_fixed integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Admins can view all security events
CREATE POLICY "Admins view all security events"
  ON public.security_events FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own security events
CREATE POLICY "Users view own security events"
  ON public.security_events FOR SELECT
  USING (auth.uid() = user_id);

-- Create project_intelligence_context table for context memory
CREATE TABLE IF NOT EXISTS public.project_intelligence_context (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  has_auth boolean DEFAULT false,
  has_profiles boolean DEFAULT false,
  has_rls boolean DEFAULT false,
  protected_routes text[] DEFAULT '{}',
  user_preferences jsonb DEFAULT '{}'::jsonb,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_intelligence_context ENABLE ROW LEVEL SECURITY;

-- Users can manage their own context
CREATE POLICY "Users manage own context"
  ON public.project_intelligence_context FOR ALL
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_pending_confirmations_user ON public.pending_confirmations(user_id);
CREATE INDEX idx_pending_confirmations_status ON public.pending_confirmations(status);
CREATE INDEX idx_security_events_user ON public.security_events(user_id);
CREATE INDEX idx_project_context_project ON public.project_intelligence_context(project_id);