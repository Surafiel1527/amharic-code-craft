-- Phase 2 Enhancement: Autonomous Deployment Intelligence

-- Create deployment validations table
CREATE TABLE IF NOT EXISTS public.deployment_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id UUID NOT NULL REFERENCES public.vercel_deployments(id) ON DELETE CASCADE,
  validation_type TEXT NOT NULL CHECK (validation_type IN ('security', 'performance', 'compatibility', 'dependencies', 'bundle_size')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'passed', 'failed', 'warning')),
  issues JSONB DEFAULT '[]'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  auto_fixed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_deployment_validations_deployment ON public.deployment_validations(deployment_id, validation_type);
CREATE INDEX IF NOT EXISTS idx_deployment_validations_status ON public.deployment_validations(status);

-- Create deployment health checks table
CREATE TABLE IF NOT EXISTS public.deployment_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id UUID NOT NULL REFERENCES public.vercel_deployments(id) ON DELETE CASCADE,
  check_type TEXT NOT NULL CHECK (check_type IN ('uptime', 'response_time', 'error_rate', 'ssl', 'dns')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'healthy', 'degraded', 'unhealthy')),
  response_time_ms INTEGER,
  error_details JSONB,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deployment_health_checks_deployment ON public.deployment_health_checks(deployment_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_deployment_health_checks_status ON public.deployment_health_checks(status, checked_at DESC);

-- Create deployment rollbacks table
CREATE TABLE IF NOT EXISTS public.deployment_rollbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_deployment_id UUID NOT NULL REFERENCES public.vercel_deployments(id) ON DELETE CASCADE,
  to_deployment_id UUID REFERENCES public.vercel_deployments(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  triggered_by TEXT NOT NULL CHECK (triggered_by IN ('manual', 'auto_health_check', 'auto_error_rate', 'ai_decision')),
  rollback_status TEXT NOT NULL DEFAULT 'pending' CHECK (rollback_status IN ('pending', 'in_progress', 'completed', 'failed')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_deployment_rollbacks_from ON public.deployment_rollbacks(from_deployment_id);
CREATE INDEX IF NOT EXISTS idx_deployment_rollbacks_status ON public.deployment_rollbacks(rollback_status);

-- Create deployment analytics table
CREATE TABLE IF NOT EXISTS public.deployment_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id UUID NOT NULL REFERENCES public.vercel_deployments(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_deployment_analytics_deployment ON public.deployment_analytics(deployment_id, measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_deployment_analytics_metric ON public.deployment_analytics(metric_type, measured_at DESC);

-- Create deployment learnings table (AI learns from deployments)
CREATE TABLE IF NOT EXISTS public.deployment_learnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_name TEXT NOT NULL,
  pattern_type TEXT NOT NULL CHECK (pattern_type IN ('success', 'failure', 'optimization', 'best_practice')),
  learned_from_deployments INTEGER DEFAULT 1,
  confidence_score NUMERIC DEFAULT 50 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  recommendation TEXT NOT NULL,
  conditions JSONB DEFAULT '{}'::jsonb,
  impact_score NUMERIC DEFAULT 0,
  times_applied INTEGER DEFAULT 0,
  success_rate NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_applied_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deployment_learnings_pattern ON public.deployment_learnings(pattern_type, confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_deployment_learnings_success ON public.deployment_learnings(success_rate DESC);

-- RLS Policies
ALTER TABLE public.deployment_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployment_health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployment_rollbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployment_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployment_learnings ENABLE ROW LEVEL SECURITY;

-- Validations policies
CREATE POLICY "Users can view their deployment validations" ON public.deployment_validations
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.vercel_deployments 
    WHERE id = deployment_validations.deployment_id 
    AND user_id = auth.uid()
  ));

CREATE POLICY "System can manage validations" ON public.deployment_validations
  FOR ALL USING (true);

-- Health checks policies
CREATE POLICY "Users can view their deployment health" ON public.deployment_health_checks
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.vercel_deployments 
    WHERE id = deployment_health_checks.deployment_id 
    AND user_id = auth.uid()
  ));

CREATE POLICY "System can manage health checks" ON public.deployment_health_checks
  FOR ALL USING (true);

-- Rollbacks policies
CREATE POLICY "Users can view their rollbacks" ON public.deployment_rollbacks
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.vercel_deployments 
    WHERE id = deployment_rollbacks.from_deployment_id 
    AND user_id = auth.uid()
  ));

CREATE POLICY "Users can trigger rollbacks" ON public.deployment_rollbacks
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.vercel_deployments 
    WHERE id = from_deployment_id 
    AND user_id = auth.uid()
  ));

CREATE POLICY "System can manage rollbacks" ON public.deployment_rollbacks
  FOR ALL USING (true);

-- Analytics policies
CREATE POLICY "Users can view their deployment analytics" ON public.deployment_analytics
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.vercel_deployments 
    WHERE id = deployment_analytics.deployment_id 
    AND user_id = auth.uid()
  ));

CREATE POLICY "System can manage analytics" ON public.deployment_analytics
  FOR ALL USING (true);

-- Learnings policies (everyone can read, only system can write)
CREATE POLICY "Anyone can view deployment learnings" ON public.deployment_learnings
  FOR SELECT USING (true);

CREATE POLICY "System can manage learnings" ON public.deployment_learnings
  FOR ALL USING (true);

-- Helper function to record deployment analytics
CREATE OR REPLACE FUNCTION public.record_deployment_metric(
  p_deployment_id UUID,
  p_metric_type TEXT,
  p_metric_value NUMERIC,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_metric_id UUID;
BEGIN
  INSERT INTO public.deployment_analytics (deployment_id, metric_type, metric_value, metadata)
  VALUES (p_deployment_id, p_metric_type, p_metric_value, p_metadata)
  RETURNING id INTO v_metric_id;
  
  RETURN v_metric_id;
END;
$$;

-- Helper function to trigger auto-rollback
CREATE OR REPLACE FUNCTION public.trigger_auto_rollback(
  p_from_deployment_id UUID,
  p_reason TEXT,
  p_triggered_by TEXT DEFAULT 'auto_health_check'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rollback_id UUID;
  v_previous_deployment_id UUID;
  v_user_id UUID;
BEGIN
  -- Get the user_id and find previous successful deployment
  SELECT user_id INTO v_user_id
  FROM public.vercel_deployments
  WHERE id = p_from_deployment_id;
  
  -- Find last successful deployment before this one
  SELECT id INTO v_previous_deployment_id
  FROM public.vercel_deployments
  WHERE user_id = v_user_id
  AND status = 'ready'
  AND created_at < (SELECT created_at FROM public.vercel_deployments WHERE id = p_from_deployment_id)
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Create rollback record
  INSERT INTO public.deployment_rollbacks (
    from_deployment_id,
    to_deployment_id,
    reason,
    triggered_by,
    rollback_status
  ) VALUES (
    p_from_deployment_id,
    v_previous_deployment_id,
    p_reason,
    p_triggered_by,
    'pending'
  ) RETURNING id INTO v_rollback_id;
  
  -- Send alert
  PERFORM public.send_alert(
    'auto_rollback_triggered',
    'warning',
    'Automatic Rollback Triggered',
    format('Deployment has been automatically rolled back. Reason: %s', p_reason),
    jsonb_build_object(
      'rollback_id', v_rollback_id,
      'from_deployment_id', p_from_deployment_id,
      'to_deployment_id', v_previous_deployment_id
    )
  );
  
  RETURN v_rollback_id;
END;
$$;

-- Setup cron job for automated health monitoring
SELECT cron.schedule(
  'deployment-health-monitor',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://xuncvfnvatgqshlivuep.supabase.co/functions/v1/deployment-health-monitor',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1bmN2Zm52YXRncXNobGl2dWVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMzcxNjIsImV4cCI6MjA3NDgxMzE2Mn0.NSXCzJBFSOLlUUErIjKqLv3-8drmvbSfat8Bf_ewu6o"}'::jsonb
  ) AS request_id;
  $$
);