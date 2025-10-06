-- Phase 5A: Predictive Intelligence & Build Optimization

-- Build cache with AI optimization
CREATE TABLE IF NOT EXISTS public.build_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  cache_key TEXT NOT NULL,
  cache_data JSONB NOT NULL DEFAULT '{}',
  build_time_ms INTEGER,
  cache_hit_rate NUMERIC DEFAULT 0,
  optimization_score INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  ai_recommendations JSONB DEFAULT '[]'
);

CREATE INDEX idx_build_cache_key ON public.build_cache(cache_key);
CREATE INDEX idx_build_cache_project ON public.build_cache(project_id);
CREATE INDEX idx_build_cache_expires ON public.build_cache(expires_at);

-- Predictive alerts for pre-failure warnings
CREATE TABLE IF NOT EXISTS public.predictive_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  prediction_confidence NUMERIC NOT NULL DEFAULT 0,
  predicted_failure_time TIMESTAMPTZ,
  current_metrics JSONB NOT NULL DEFAULT '{}',
  recommended_actions JSONB NOT NULL DEFAULT '[]',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'false_positive')),
  acknowledged_by UUID,
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_predictive_alerts_status ON public.predictive_alerts(status);
CREATE INDEX idx_predictive_alerts_severity ON public.predictive_alerts(severity);
CREATE INDEX idx_predictive_alerts_created ON public.predictive_alerts(created_at DESC);

-- Build optimizations learned by AI
CREATE TABLE IF NOT EXISTS public.build_optimizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  optimization_type TEXT NOT NULL,
  optimization_name TEXT NOT NULL,
  before_metrics JSONB NOT NULL DEFAULT '{}',
  after_metrics JSONB NOT NULL DEFAULT '{}',
  improvement_percentage NUMERIC,
  applied_count INTEGER DEFAULT 0,
  success_rate NUMERIC DEFAULT 100,
  confidence_score NUMERIC DEFAULT 50,
  optimization_code TEXT,
  learned_from_projects INTEGER DEFAULT 1,
  auto_apply BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_applied_at TIMESTAMPTZ,
  UNIQUE(optimization_name)
);

CREATE INDEX idx_build_optimizations_type ON public.build_optimizations(optimization_type);
CREATE INDEX idx_build_optimizations_auto ON public.build_optimizations(auto_apply);

-- System-wide predictions
CREATE TABLE IF NOT EXISTS public.system_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_type TEXT NOT NULL,
  target_system TEXT NOT NULL,
  failure_probability NUMERIC NOT NULL,
  time_to_failure_hours INTEGER,
  root_cause_analysis JSONB NOT NULL DEFAULT '{}',
  preventive_actions JSONB NOT NULL DEFAULT '[]',
  confidence_score NUMERIC NOT NULL,
  prediction_data JSONB NOT NULL DEFAULT '{}',
  validated BOOLEAN DEFAULT false,
  actual_outcome TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  predicted_for TIMESTAMPTZ
);

CREATE INDEX idx_system_predictions_type ON public.system_predictions(prediction_type);
CREATE INDEX idx_system_predictions_target ON public.system_predictions(target_system);
CREATE INDEX idx_system_predictions_created ON public.system_predictions(created_at DESC);

-- Phase 5B: Full Deployment Automation

-- Complete deployment pipelines
CREATE TABLE IF NOT EXISTS public.deployment_pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  pipeline_name TEXT NOT NULL,
  pipeline_config JSONB NOT NULL DEFAULT '{}',
  stages JSONB NOT NULL DEFAULT '[]',
  auto_deploy BOOLEAN DEFAULT false,
  auto_rollback BOOLEAN DEFAULT true,
  rollback_threshold NUMERIC DEFAULT 0.7,
  health_checks JSONB DEFAULT '[]',
  notifications JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_deployment_pipelines_user ON public.deployment_pipelines(user_id);
CREATE INDEX idx_deployment_pipelines_project ON public.deployment_pipelines(project_id);
CREATE INDEX idx_deployment_pipelines_active ON public.deployment_pipelines(is_active);

-- Auto rollback logs
CREATE TABLE IF NOT EXISTS public.auto_rollback_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id UUID,
  pipeline_id UUID REFERENCES public.deployment_pipelines(id) ON DELETE CASCADE,
  trigger_reason TEXT NOT NULL,
  rollback_strategy TEXT NOT NULL,
  from_version TEXT,
  to_version TEXT,
  health_metrics_before JSONB DEFAULT '{}',
  health_metrics_after JSONB DEFAULT '{}',
  success BOOLEAN DEFAULT false,
  error_message TEXT,
  triggered_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER
);

CREATE INDEX idx_auto_rollback_logs_pipeline ON public.auto_rollback_logs(pipeline_id);
CREATE INDEX idx_auto_rollback_logs_triggered ON public.auto_rollback_logs(triggered_at DESC);

-- Deployment predictions
CREATE TABLE IF NOT EXISTS public.deployment_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID REFERENCES public.deployment_pipelines(id) ON DELETE CASCADE,
  prediction_type TEXT NOT NULL,
  success_probability NUMERIC NOT NULL,
  risk_factors JSONB DEFAULT '[]',
  recommended_changes JSONB DEFAULT '[]',
  estimated_duration_minutes INTEGER,
  confidence_score NUMERIC NOT NULL,
  prediction_data JSONB DEFAULT '{}',
  actual_result TEXT,
  prediction_accuracy NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_deployment_predictions_pipeline ON public.deployment_predictions(pipeline_id);
CREATE INDEX idx_deployment_predictions_created ON public.deployment_predictions(created_at DESC);

-- Meta improvement queue for system self-improvement
CREATE TABLE IF NOT EXISTS public.meta_improvement_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  improvement_category TEXT NOT NULL,
  current_performance JSONB NOT NULL DEFAULT '{}',
  target_performance JSONB NOT NULL DEFAULT '{}',
  proposed_changes JSONB NOT NULL DEFAULT '{}',
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'analyzing', 'testing', 'approved', 'applied', 'rejected')),
  confidence_score NUMERIC DEFAULT 50,
  impact_analysis JSONB DEFAULT '{}',
  test_results JSONB,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_meta_improvement_status ON public.meta_improvement_queue(status);
CREATE INDEX idx_meta_improvement_priority ON public.meta_improvement_queue(priority);

-- RLS Policies
ALTER TABLE public.build_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictive_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_optimizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployment_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_rollback_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployment_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_improvement_queue ENABLE ROW LEVEL SECURITY;

-- Build cache policies
CREATE POLICY "Users can view their project cache"
  ON public.build_cache FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = build_cache.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage build cache"
  ON public.build_cache FOR ALL
  USING (true)
  WITH CHECK (true);

-- Predictive alerts policies
CREATE POLICY "Admins can view all alerts"
  ON public.predictive_alerts FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can manage alerts"
  ON public.predictive_alerts FOR ALL
  USING (true)
  WITH CHECK (true);

-- Build optimizations policies
CREATE POLICY "Anyone can view optimizations"
  ON public.build_optimizations FOR SELECT
  USING (true);

CREATE POLICY "System can manage optimizations"
  ON public.build_optimizations FOR ALL
  USING (true)
  WITH CHECK (true);

-- System predictions policies
CREATE POLICY "Admins can view predictions"
  ON public.system_predictions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can manage predictions"
  ON public.system_predictions FOR ALL
  USING (true)
  WITH CHECK (true);

-- Deployment pipelines policies
CREATE POLICY "Users can manage their pipelines"
  ON public.deployment_pipelines FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto rollback logs policies
CREATE POLICY "Users can view their rollback logs"
  ON public.auto_rollback_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.deployment_pipelines
      WHERE deployment_pipelines.id = auto_rollback_logs.pipeline_id
      AND deployment_pipelines.user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage rollback logs"
  ON public.auto_rollback_logs FOR ALL
  USING (true)
  WITH CHECK (true);

-- Deployment predictions policies
CREATE POLICY "Users can view their deployment predictions"
  ON public.deployment_predictions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.deployment_pipelines
      WHERE deployment_pipelines.id = deployment_predictions.pipeline_id
      AND deployment_pipelines.user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage deployment predictions"
  ON public.deployment_predictions FOR ALL
  USING (true)
  WITH CHECK (true);

-- Meta improvement queue policies
CREATE POLICY "Admins can manage meta improvements"
  ON public.meta_improvement_queue FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view approved improvements"
  ON public.meta_improvement_queue FOR SELECT
  USING (status = 'approved');