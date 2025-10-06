-- Phase 2: Complete Deployment System
-- Create deployments tracking table
CREATE TABLE IF NOT EXISTS public.vercel_deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  vercel_deployment_id TEXT,
  vercel_project_id TEXT,
  deployment_url TEXT,
  custom_domain TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'building', 'deploying', 'ready', 'error', 'canceled')),
  build_logs JSONB DEFAULT '[]'::jsonb,
  error_message TEXT,
  env_variables JSONB DEFAULT '{}'::jsonb,
  build_command TEXT DEFAULT 'npm ci && npm run build',
  framework TEXT DEFAULT 'vite',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_checked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_vercel_deployments_user ON public.vercel_deployments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vercel_deployments_project ON public.vercel_deployments(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vercel_deployments_status ON public.vercel_deployments(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vercel_deployments_vercel_id ON public.vercel_deployments(vercel_deployment_id);

-- Create deployment builds table for build artifacts
CREATE TABLE IF NOT EXISTS public.deployment_builds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id UUID NOT NULL REFERENCES public.vercel_deployments(id) ON DELETE CASCADE,
  build_step TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  output_log TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_deployment_builds_deployment ON public.deployment_builds(deployment_id, created_at ASC);

-- Create custom domains table
CREATE TABLE IF NOT EXISTS public.custom_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  domain_name TEXT NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'failed')),
  dns_records JSONB DEFAULT '[]'::jsonb,
  ssl_status TEXT DEFAULT 'pending' CHECK (ssl_status IN ('pending', 'active', 'failed')),
  vercel_config_id TEXT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(domain_name)
);

CREATE INDEX IF NOT EXISTS idx_custom_domains_user ON public.custom_domains(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_custom_domains_project ON public.custom_domains(project_id);
CREATE INDEX IF NOT EXISTS idx_custom_domains_domain ON public.custom_domains(domain_name);

-- RLS Policies
ALTER TABLE public.vercel_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployment_builds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_domains ENABLE ROW LEVEL SECURITY;

-- Deployments policies
CREATE POLICY "Users can view their own deployments" ON public.vercel_deployments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create deployments" ON public.vercel_deployments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their deployments" ON public.vercel_deployments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can update deployments" ON public.vercel_deployments
  FOR UPDATE USING (true);

-- Build logs policies
CREATE POLICY "Users can view their deployment builds" ON public.deployment_builds
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.vercel_deployments 
    WHERE id = deployment_builds.deployment_id 
    AND user_id = auth.uid()
  ));

CREATE POLICY "System can manage deployment builds" ON public.deployment_builds
  FOR ALL USING (true);

-- Custom domains policies
CREATE POLICY "Users can manage their domains" ON public.custom_domains
  FOR ALL USING (auth.uid() = user_id);

-- Helper function to update deployment status
CREATE OR REPLACE FUNCTION public.update_deployment_status(
  p_deployment_id UUID,
  p_status TEXT,
  p_error_message TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.vercel_deployments
  SET 
    status = p_status,
    error_message = p_error_message,
    last_checked_at = now(),
    completed_at = CASE 
      WHEN p_status IN ('ready', 'error', 'canceled') THEN now()
      ELSE completed_at
    END,
    started_at = CASE
      WHEN p_status = 'building' AND started_at IS NULL THEN now()
      ELSE started_at
    END
  WHERE id = p_deployment_id;
END;
$$;