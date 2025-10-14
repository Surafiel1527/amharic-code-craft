-- A/B Testing Framework for Auto-Fixes
CREATE TABLE IF NOT EXISTS public.fix_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_pattern_id UUID REFERENCES public.universal_error_patterns(id) ON DELETE CASCADE,
  fix_variant_a JSONB NOT NULL,
  fix_variant_b JSONB NOT NULL,
  variant_a_success_count INTEGER DEFAULT 0,
  variant_a_failure_count INTEGER DEFAULT 0,
  variant_b_success_count INTEGER DEFAULT 0,
  variant_b_failure_count INTEGER DEFAULT 0,
  variant_a_success_rate NUMERIC GENERATED ALWAYS AS (
    CASE WHEN (variant_a_success_count + variant_a_failure_count) > 0
    THEN (variant_a_success_count::NUMERIC / (variant_a_success_count + variant_a_failure_count) * 100)
    ELSE 0 END
  ) STORED,
  variant_b_success_rate NUMERIC GENERATED ALWAYS AS (
    CASE WHEN (variant_b_success_count + variant_b_failure_count) > 0
    THEN (variant_b_success_count::NUMERIC / (variant_b_success_count + variant_b_failure_count) * 100)
    ELSE 0 END
  ) STORED,
  sample_size INTEGER GENERATED ALWAYS AS (
    variant_a_success_count + variant_a_failure_count + 
    variant_b_success_count + variant_b_failure_count
  ) STORED,
  winning_variant TEXT CHECK (winning_variant IN ('A', 'B', NULL)),
  experiment_status TEXT NOT NULL DEFAULT 'running' CHECK (experiment_status IN ('running', 'completed', 'cancelled')),
  confidence_level NUMERIC DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  concluded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Experiment results tracking
CREATE TABLE IF NOT EXISTS public.experiment_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES public.fix_experiments(id) ON DELETE CASCADE,
  variant_used TEXT NOT NULL CHECK (variant_used IN ('A', 'B')),
  error_id UUID REFERENCES public.detected_errors(id) ON DELETE SET NULL,
  success BOOLEAN NOT NULL,
  execution_time_ms INTEGER,
  error_message TEXT,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Deployment triggers table
CREATE TABLE IF NOT EXISTS public.deployment_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  trigger_reason TEXT NOT NULL,
  triggered_by TEXT NOT NULL DEFAULT 'autonomous_fix',
  fix_ids UUID[] DEFAULT '{}',
  deployment_id UUID REFERENCES public.vercel_deployments(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'triggered', 'completed', 'failed')),
  error_message TEXT,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Function to update experiment results
CREATE OR REPLACE FUNCTION public.record_experiment_result(
  p_experiment_id UUID,
  p_variant TEXT,
  p_success BOOLEAN
) RETURNS void AS $$
BEGIN
  IF p_variant = 'A' THEN
    IF p_success THEN
      UPDATE public.fix_experiments
      SET variant_a_success_count = variant_a_success_count + 1
      WHERE id = p_experiment_id;
    ELSE
      UPDATE public.fix_experiments
      SET variant_a_failure_count = variant_a_failure_count + 1
      WHERE id = p_experiment_id;
    END IF;
  ELSIF p_variant = 'B' THEN
    IF p_success THEN
      UPDATE public.fix_experiments
      SET variant_b_success_count = variant_b_success_count + 1
      WHERE id = p_experiment_id;
    ELSE
      UPDATE public.fix_experiments
      SET variant_b_failure_count = variant_b_failure_count + 1
      WHERE id = p_experiment_id;
    END IF;
  END IF;

  -- Check if we have statistical significance (sample size > 30 and clear winner)
  UPDATE public.fix_experiments
  SET 
    experiment_status = 'completed',
    concluded_at = now(),
    winning_variant = CASE
      WHEN sample_size >= 30 AND variant_a_success_rate > variant_b_success_rate + 10 THEN 'A'
      WHEN sample_size >= 30 AND variant_b_success_rate > variant_a_success_rate + 10 THEN 'B'
      ELSE winning_variant
    END,
    confidence_level = CASE
      WHEN sample_size >= 30 THEN
        ABS(variant_a_success_rate - variant_b_success_rate)
      ELSE confidence_level
    END
  WHERE id = p_experiment_id
    AND experiment_status = 'running'
    AND sample_size >= 30
    AND ABS(variant_a_success_rate - variant_b_success_rate) >= 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Enable RLS
ALTER TABLE public.fix_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiment_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployment_triggers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage experiments" ON public.fix_experiments
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can manage experiments" ON public.fix_experiments
  FOR ALL USING (true);

CREATE POLICY "Admins can view experiment results" ON public.experiment_results
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can manage experiment results" ON public.experiment_results
  FOR ALL USING (true);

CREATE POLICY "Admins can view deployment triggers" ON public.deployment_triggers
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can manage deployment triggers" ON public.deployment_triggers
  FOR ALL USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_fix_experiments_status ON public.fix_experiments(experiment_status);
CREATE INDEX IF NOT EXISTS idx_fix_experiments_pattern ON public.fix_experiments(error_pattern_id);
CREATE INDEX IF NOT EXISTS idx_experiment_results_experiment ON public.experiment_results(experiment_id);
CREATE INDEX IF NOT EXISTS idx_deployment_triggers_project ON public.deployment_triggers(project_id);
CREATE INDEX IF NOT EXISTS idx_deployment_triggers_status ON public.deployment_triggers(status);