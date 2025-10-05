-- Enhanced enterprise tables for monitoring and learning

-- Database connection health monitoring
CREATE TABLE IF NOT EXISTS public.database_connection_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id UUID REFERENCES public.database_credentials(id) ON DELETE CASCADE,
  check_timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'down')),
  response_time_ms INTEGER,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  alerts_sent BOOLEAN DEFAULT false
);

-- Connection retry attempts tracking
CREATE TABLE IF NOT EXISTS public.database_connection_retries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id UUID REFERENCES public.database_credentials(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL,
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  success BOOLEAN NOT NULL,
  error_message TEXT,
  retry_strategy JSONB DEFAULT '{}'::jsonb,
  backoff_delay_ms INTEGER
);

-- Knowledge base for connection intelligence
CREATE TABLE IF NOT EXISTS public.database_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  category TEXT NOT NULL, -- 'error_resolution', 'optimization', 'security', 'configuration'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  solution TEXT NOT NULL,
  success_rate NUMERIC DEFAULT 100,
  usage_count INTEGER DEFAULT 0,
  confidence_score NUMERIC DEFAULT 50,
  learned_from_error_id UUID REFERENCES public.database_connection_errors(id),
  code_examples JSONB DEFAULT '[]'::jsonb,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE
);

-- Audit log for all database operations
CREATE TABLE IF NOT EXISTS public.database_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  credential_id UUID REFERENCES public.database_credentials(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'create', 'update', 'delete', 'test', 'health_check', 'retry'
  status TEXT NOT NULL, -- 'success', 'failure', 'warning'
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Alert configuration for monitoring
CREATE TABLE IF NOT EXISTS public.database_alert_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  credential_id UUID REFERENCES public.database_credentials(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL, -- 'downtime', 'slow_response', 'error_rate', 'security'
  threshold JSONB NOT NULL,
  notification_channels JSONB DEFAULT '["email"]'::jsonb,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Connection performance metrics
CREATE TABLE IF NOT EXISTS public.database_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id UUID REFERENCES public.database_credentials(id) ON DELETE CASCADE,
  metric_date DATE DEFAULT CURRENT_DATE,
  avg_response_time_ms NUMERIC,
  min_response_time_ms INTEGER,
  max_response_time_ms INTEGER,
  total_requests INTEGER DEFAULT 0,
  successful_requests INTEGER DEFAULT 0,
  failed_requests INTEGER DEFAULT 0,
  uptime_percentage NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.database_connection_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.database_connection_retries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.database_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.database_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.database_alert_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.database_performance_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for database_connection_health
CREATE POLICY "Users can view health of their connections"
  ON public.database_connection_health FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.database_credentials
    WHERE database_credentials.id = database_connection_health.credential_id
    AND database_credentials.user_id = auth.uid()
  ));

CREATE POLICY "System can manage health checks"
  ON public.database_connection_health FOR ALL
  USING (true);

-- RLS Policies for database_connection_retries
CREATE POLICY "Users can view retries of their connections"
  ON public.database_connection_retries FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.database_credentials
    WHERE database_credentials.id = database_connection_retries.credential_id
    AND database_credentials.user_id = auth.uid()
  ));

CREATE POLICY "System can manage retries"
  ON public.database_connection_retries FOR ALL
  USING (true);

-- RLS Policies for database_knowledge_base
CREATE POLICY "Anyone can view knowledge base"
  ON public.database_knowledge_base FOR SELECT
  USING (true);

CREATE POLICY "System can manage knowledge base"
  ON public.database_knowledge_base FOR ALL
  USING (true);

-- RLS Policies for database_audit_log
CREATE POLICY "Users can view their own audit logs"
  ON public.database_audit_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert audit logs"
  ON public.database_audit_log FOR INSERT
  WITH CHECK (true);

-- RLS Policies for database_alert_config
CREATE POLICY "Users can manage their own alert configs"
  ON public.database_alert_config FOR ALL
  USING (auth.uid() = user_id);

-- RLS Policies for database_performance_metrics
CREATE POLICY "Users can view metrics of their connections"
  ON public.database_performance_metrics FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.database_credentials
    WHERE database_credentials.id = database_performance_metrics.credential_id
    AND database_credentials.user_id = auth.uid()
  ));

CREATE POLICY "System can manage metrics"
  ON public.database_performance_metrics FOR ALL
  USING (true);

-- Create indexes for performance
CREATE INDEX idx_health_credential_timestamp ON public.database_connection_health(credential_id, check_timestamp DESC);
CREATE INDEX idx_retries_credential ON public.database_connection_retries(credential_id, attempted_at DESC);
CREATE INDEX idx_knowledge_provider_category ON public.database_knowledge_base(provider, category);
CREATE INDEX idx_audit_user_timestamp ON public.database_audit_log(user_id, created_at DESC);
CREATE INDEX idx_alerts_credential ON public.database_alert_config(credential_id);
CREATE INDEX idx_metrics_credential_date ON public.database_performance_metrics(credential_id, metric_date DESC);

-- Function to calculate uptime percentage
CREATE OR REPLACE FUNCTION calculate_uptime_percentage(p_credential_id UUID, p_hours INTEGER DEFAULT 24)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_checks INTEGER;
  healthy_checks INTEGER;
  uptime NUMERIC;
BEGIN
  SELECT COUNT(*) INTO total_checks
  FROM database_connection_health
  WHERE credential_id = p_credential_id
  AND check_timestamp > now() - (p_hours || ' hours')::INTERVAL;

  SELECT COUNT(*) INTO healthy_checks
  FROM database_connection_health
  WHERE credential_id = p_credential_id
  AND check_timestamp > now() - (p_hours || ' hours')::INTERVAL
  AND status = 'healthy';

  IF total_checks = 0 THEN
    RETURN 100;
  END IF;

  uptime := (healthy_checks::NUMERIC / total_checks::NUMERIC) * 100;
  RETURN ROUND(uptime, 2);
END;
$$;