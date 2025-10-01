-- Create table for detected errors
CREATE TABLE IF NOT EXISTS public.detected_errors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  error_context JSONB DEFAULT '{}'::jsonb,
  source TEXT NOT NULL, -- 'frontend', 'edge_function', 'database'
  function_name TEXT,
  file_path TEXT,
  line_number INTEGER,
  severity TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  status TEXT NOT NULL DEFAULT 'detected', -- 'detected', 'analyzing', 'fixing', 'fixed', 'failed'
  fix_attempts INTEGER DEFAULT 0,
  auto_fix_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Create table for auto-generated fixes
CREATE TABLE IF NOT EXISTS public.auto_fixes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  error_id UUID NOT NULL REFERENCES public.detected_errors(id) ON DELETE CASCADE,
  fix_type TEXT NOT NULL, -- 'code_patch', 'migration', 'config_change'
  original_code TEXT,
  fixed_code TEXT NOT NULL,
  explanation TEXT NOT NULL,
  ai_confidence NUMERIC CHECK (ai_confidence >= 0 AND ai_confidence <= 1),
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'applied', 'verified', 'rolled_back', 'failed'
  applied_at TIMESTAMP WITH TIME ZONE,
  verified_at TIMESTAMP WITH TIME ZONE,
  rolled_back_at TIMESTAMP WITH TIME ZONE,
  verification_result JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for fix verification results
CREATE TABLE IF NOT EXISTS public.fix_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fix_id UUID NOT NULL REFERENCES public.auto_fixes(id) ON DELETE CASCADE,
  verification_type TEXT NOT NULL, -- 'test', 'health_check', 'error_rate'
  passed BOOLEAN NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for system health metrics
CREATE TABLE IF NOT EXISTS public.system_health (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_type TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.detected_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_fixes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fix_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_health ENABLE ROW LEVEL SECURITY;

-- Policies for detected_errors
CREATE POLICY "Admins can manage detected errors"
  ON public.detected_errors
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert errors"
  ON public.detected_errors
  FOR INSERT
  WITH CHECK (true);

-- Policies for auto_fixes
CREATE POLICY "Admins can manage fixes"
  ON public.auto_fixes
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert fixes"
  ON public.auto_fixes
  FOR INSERT
  WITH CHECK (true);

-- Policies for fix_verifications
CREATE POLICY "Admins can view verifications"
  ON public.fix_verifications
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert verifications"
  ON public.fix_verifications
  FOR INSERT
  WITH CHECK (true);

-- Policies for system_health
CREATE POLICY "Admins can view health metrics"
  ON public.system_health
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert health metrics"
  ON public.system_health
  FOR INSERT
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_detected_errors_status ON public.detected_errors(status);
CREATE INDEX idx_detected_errors_severity ON public.detected_errors(severity);
CREATE INDEX idx_detected_errors_created_at ON public.detected_errors(created_at DESC);
CREATE INDEX idx_auto_fixes_error_id ON public.auto_fixes(error_id);
CREATE INDEX idx_auto_fixes_status ON public.auto_fixes(status);
CREATE INDEX idx_system_health_type ON public.system_health(metric_type);
CREATE INDEX idx_system_health_created_at ON public.system_health(created_at DESC);

-- Enable realtime for detected_errors
ALTER PUBLICATION supabase_realtime ADD TABLE public.detected_errors;
ALTER PUBLICATION supabase_realtime ADD TABLE public.auto_fixes;

-- Create function to calculate error rate
CREATE OR REPLACE FUNCTION get_error_rate(time_window INTERVAL DEFAULT '1 hour')
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  error_count INTEGER;
  total_requests INTEGER;
BEGIN
  SELECT COUNT(*) INTO error_count
  FROM detected_errors
  WHERE created_at > (now() - time_window)
  AND severity IN ('high', 'critical');

  SELECT COUNT(*) INTO total_requests
  FROM generation_analytics
  WHERE created_at > (now() - time_window);

  IF total_requests = 0 THEN
    RETURN 0;
  END IF;

  RETURN (error_count::NUMERIC / total_requests::NUMERIC) * 100;
END;
$$;