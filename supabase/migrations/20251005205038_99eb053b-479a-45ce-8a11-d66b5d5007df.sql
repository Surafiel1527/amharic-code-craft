-- Phase 6D: Production Monitoring & Performance Tables

-- Production Metrics Table
CREATE TABLE IF NOT EXISTS public.production_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  endpoint TEXT,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_production_metrics_type ON public.production_metrics(metric_type);
CREATE INDEX idx_production_metrics_recorded_at ON public.production_metrics(recorded_at DESC);
CREATE INDEX idx_production_metrics_endpoint ON public.production_metrics(endpoint);

-- Alert Rules Table
CREATE TABLE IF NOT EXISTS public.alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  metric_type TEXT NOT NULL,
  threshold NUMERIC NOT NULL,
  condition TEXT NOT NULL CHECK (condition IN ('greater_than', 'less_than', 'equals')),
  notification_channels JSONB DEFAULT '["email"]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_alert_rules_active ON public.alert_rules(is_active);
CREATE INDEX idx_alert_rules_metric_type ON public.alert_rules(metric_type);

-- System Alerts Table
CREATE TABLE IF NOT EXISTS public.system_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_rule_id UUID REFERENCES public.alert_rules(id) ON DELETE CASCADE,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  message TEXT NOT NULL,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_system_alerts_severity ON public.system_alerts(severity);
CREATE INDEX idx_system_alerts_resolved ON public.system_alerts(resolved);
CREATE INDEX idx_system_alerts_created_at ON public.system_alerts(created_at DESC);

-- Performance Cache Table
CREATE TABLE IF NOT EXISTS public.performance_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT UNIQUE NOT NULL,
  cache_value JSONB NOT NULL,
  ttl_seconds INTEGER NOT NULL DEFAULT 3600,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  hit_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_performance_cache_key ON public.performance_cache(cache_key);
CREATE INDEX idx_performance_cache_expires ON public.performance_cache(expires_at);

-- Test Results Table
CREATE TABLE IF NOT EXISTS public.test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_suite TEXT NOT NULL,
  test_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('passed', 'failed', 'skipped')),
  duration_ms INTEGER,
  error_message TEXT,
  stack_trace TEXT,
  ran_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  commit_hash TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_test_results_suite ON public.test_results(test_suite);
CREATE INDEX idx_test_results_status ON public.test_results(status);
CREATE INDEX idx_test_results_ran_at ON public.test_results(ran_at DESC);

-- Performance Optimization Suggestions Table
CREATE TABLE IF NOT EXISTS public.optimization_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT NOT NULL,
  suggested_fix TEXT NOT NULL,
  auto_applied BOOLEAN DEFAULT false,
  applied_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_optimization_suggestions_type ON public.optimization_suggestions(suggestion_type);
CREATE INDEX idx_optimization_suggestions_severity ON public.optimization_suggestions(severity);

-- Security Vulnerabilities Table
CREATE TABLE IF NOT EXISTS public.security_vulnerabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vulnerability_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'low', 'medium', 'high', 'critical')),
  description TEXT NOT NULL,
  affected_component TEXT NOT NULL,
  cve_id TEXT,
  remediation TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'ignored')),
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_security_vulnerabilities_severity ON public.security_vulnerabilities(severity);
CREATE INDEX idx_security_vulnerabilities_status ON public.security_vulnerabilities(status);

-- Enable RLS
ALTER TABLE public.production_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.optimization_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_vulnerabilities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Production Metrics
CREATE POLICY "Admins can view all production metrics"
  ON public.production_metrics FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert production metrics"
  ON public.production_metrics FOR INSERT
  WITH CHECK (true);

-- RLS Policies for Alert Rules
CREATE POLICY "Admins can manage alert rules"
  ON public.alert_rules FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for System Alerts
CREATE POLICY "Admins can view system alerts"
  ON public.system_alerts FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert alerts"
  ON public.system_alerts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can update alerts"
  ON public.system_alerts FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for Performance Cache
CREATE POLICY "Anyone can read cache"
  ON public.performance_cache FOR SELECT
  USING (true);

CREATE POLICY "System can manage cache"
  ON public.performance_cache FOR ALL
  USING (true);

-- RLS Policies for Test Results
CREATE POLICY "Admins can view test results"
  ON public.test_results FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert test results"
  ON public.test_results FOR INSERT
  WITH CHECK (true);

-- RLS Policies for Optimization Suggestions
CREATE POLICY "Admins can view optimization suggestions"
  ON public.optimization_suggestions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can manage optimization suggestions"
  ON public.optimization_suggestions FOR ALL
  USING (true);

-- RLS Policies for Security Vulnerabilities
CREATE POLICY "Admins can manage security vulnerabilities"
  ON public.security_vulnerabilities FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Function to clean up expired cache
CREATE OR REPLACE FUNCTION public.cleanup_expired_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.performance_cache
  WHERE expires_at < now();
END;
$$;