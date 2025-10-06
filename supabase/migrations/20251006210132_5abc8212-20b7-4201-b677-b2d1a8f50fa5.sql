-- Pipeline stages tracking table
CREATE TABLE IF NOT EXISTS public.deployment_pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id UUID NOT NULL,
  stage_name TEXT NOT NULL,
  stage_order INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  output_logs TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Build artifacts storage
CREATE TABLE IF NOT EXISTS public.build_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id UUID NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_hash TEXT,
  storage_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Pre-deployment checks
CREATE TABLE IF NOT EXISTS public.deployment_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id UUID NOT NULL,
  check_type TEXT NOT NULL,
  check_name TEXT NOT NULL,
  passed BOOLEAN NOT NULL,
  message TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_deployment ON public.deployment_pipeline_stages(deployment_id);
CREATE INDEX IF NOT EXISTS idx_build_artifacts_deployment ON public.build_artifacts(deployment_id);
CREATE INDEX IF NOT EXISTS idx_deployment_checks_deployment ON public.deployment_checks(deployment_id);

-- Enable RLS
ALTER TABLE public.deployment_pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployment_checks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own pipeline stages"
  ON public.deployment_pipeline_stages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.vercel_deployments vd
      WHERE vd.id = deployment_id AND vd.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own build artifacts"
  ON public.build_artifacts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.vercel_deployments vd
      WHERE vd.id = deployment_id AND vd.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own deployment checks"
  ON public.deployment_checks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.vercel_deployments vd
      WHERE vd.id = deployment_id AND vd.user_id = auth.uid()
    )
  );