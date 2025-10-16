-- ============================================
-- WORLD-CLASS ENTERPRISE: Phase 4-6 Database Tables
-- ============================================

-- Table: ensemble_decisions
-- Stores ensemble learning decisions and outcomes
CREATE TABLE IF NOT EXISTS public.ensemble_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_id UUID,
  voting_method TEXT NOT NULL CHECK (voting_method IN ('weighted', 'majority', 'unanimous', 'best-confidence')),
  selected_strategy TEXT NOT NULL,
  confidence NUMERIC NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  strategies_count INTEGER NOT NULL CHECK (strategies_count > 0),
  success BOOLEAN,
  reasoning TEXT,
  strategies_data JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_ensemble_decisions_error_id ON public.ensemble_decisions(error_id);
CREATE INDEX IF NOT EXISTS idx_ensemble_decisions_voting_method ON public.ensemble_decisions(voting_method);
CREATE INDEX IF NOT EXISTS idx_ensemble_decisions_success ON public.ensemble_decisions(success);
CREATE INDEX IF NOT EXISTS idx_ensemble_decisions_created_at ON public.ensemble_decisions(created_at DESC);

-- Enable RLS
ALTER TABLE public.ensemble_decisions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "System can manage ensemble decisions"
ON public.ensemble_decisions
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Admins can view ensemble decisions"
ON public.ensemble_decisions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Table: statistical_validations
-- Stores statistical test results and confidence intervals
CREATE TABLE IF NOT EXISTS public.statistical_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_id UUID,
  test_type TEXT NOT NULL CHECK (test_type IN ('confidence_interval', 'proportion_test', 'bayesian_update', 'chi_square', 'ab_test_power')),
  p_value NUMERIC,
  confidence_level NUMERIC NOT NULL CHECK (confidence_level >= 0 AND confidence_level <= 1),
  lower_bound NUMERIC,
  upper_bound NUMERIC,
  is_significant BOOLEAN,
  sample_size INTEGER NOT NULL,
  successes INTEGER,
  failures INTEGER,
  test_result JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_statistical_validations_pattern_id ON public.statistical_validations(pattern_id);
CREATE INDEX IF NOT EXISTS idx_statistical_validations_test_type ON public.statistical_validations(test_type);
CREATE INDEX IF NOT EXISTS idx_statistical_validations_is_significant ON public.statistical_validations(is_significant);

-- Enable RLS
ALTER TABLE public.statistical_validations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "System can manage statistical validations"
ON public.statistical_validations
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Admins can view statistical validations"
ON public.statistical_validations
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Table: performance_metrics_log
-- Comprehensive performance tracking
CREATE TABLE IF NOT EXISTS public.performance_metrics_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_name TEXT NOT NULL,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('database', 'ai', 'api', 'healing', 'validation')),
  duration_ms INTEGER NOT NULL,
  success BOOLEAN NOT NULL DEFAULT true,
  method TEXT CHECK (method IN ('deterministic', 'ai', 'pattern', 'direct')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for analytics
CREATE INDEX IF NOT EXISTS idx_performance_metrics_operation_name ON public.performance_metrics_log(operation_name);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_operation_type ON public.performance_metrics_log(operation_type);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_success ON public.performance_metrics_log(success);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_created_at ON public.performance_metrics_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_method ON public.performance_metrics_log(method);

-- Enable RLS
ALTER TABLE public.performance_metrics_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "System can insert performance metrics"
ON public.performance_metrics_log
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view performance metrics"
ON public.performance_metrics_log
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create function to cleanup old metrics (keep last 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_performance_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.performance_metrics_log
  WHERE created_at < now() - interval '30 days';
END;
$$;

-- Comment on tables
COMMENT ON TABLE public.ensemble_decisions IS 'Tracks ensemble learning decisions combining multiple fix strategies';
COMMENT ON TABLE public.statistical_validations IS 'Stores statistical test results for pattern validation and A/B testing';
COMMENT ON TABLE public.performance_metrics_log IS 'Comprehensive performance tracking for all operations';
