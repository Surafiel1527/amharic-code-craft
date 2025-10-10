-- ============================================
-- Production Monitoring & Auto-Test Generation
-- ============================================

-- Track all generation failures in production
CREATE TABLE IF NOT EXISTS public.generation_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  user_request TEXT NOT NULL,
  request_context JSONB DEFAULT '{}'::jsonb,
  stack_trace TEXT,
  framework TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Failure classification
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  failure_category TEXT NOT NULL DEFAULT 'unknown' CHECK (failure_category IN (
    'ai_timeout', 'validation_error', 'dependency_error', 
    'syntax_error', 'rate_limit', 'unknown'
  )),
  
  -- Auto-test generation tracking
  test_generated BOOLEAN DEFAULT false,
  test_id UUID,
  occurrence_count INTEGER DEFAULT 1,
  last_occurred_at TIMESTAMPTZ DEFAULT now()
);

-- Track auto-generated tests
CREATE TABLE IF NOT EXISTS public.auto_generated_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_name TEXT NOT NULL UNIQUE,
  test_type TEXT NOT NULL CHECK (test_type IN ('smoke', 'regression', 'contract', 'integration')),
  test_prompt TEXT NOT NULL,
  expected_behavior JSONB NOT NULL,
  framework TEXT NOT NULL,
  
  -- Test execution tracking
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_run_at TIMESTAMPTZ,
  run_count INTEGER DEFAULT 0,
  pass_count INTEGER DEFAULT 0,
  fail_count INTEGER DEFAULT 0,
  
  -- Test health
  is_active BOOLEAN DEFAULT true,
  confidence_score NUMERIC DEFAULT 50 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  
  -- Metadata
  created_from_failure_id UUID REFERENCES public.generation_failures(id),
  tags TEXT[] DEFAULT '{}',
  expected_files TEXT[] DEFAULT '{}'
);

-- Track test execution results
CREATE TABLE IF NOT EXISTS public.test_execution_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES public.auto_generated_tests(id) ON DELETE CASCADE,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Execution details
  passed BOOLEAN NOT NULL,
  duration_ms INTEGER NOT NULL,
  error_message TEXT,
  actual_output JSONB,
  expected_output JSONB,
  
  -- Environment
  environment TEXT NOT NULL DEFAULT 'production' CHECK (environment IN ('development', 'staging', 'production')),
  triggered_by TEXT NOT NULL DEFAULT 'manual' CHECK (triggered_by IN ('manual', 'cron', 'ci_cd', 'deployment', 'user_report'))
);

-- Enable RLS
ALTER TABLE public.generation_failures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_generated_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_execution_results ENABLE ROW LEVEL SECURITY;

-- Policies for generation_failures
CREATE POLICY "System can insert failures"
  ON public.generation_failures FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all failures"
  ON public.generation_failures FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can view their own failures"
  ON public.generation_failures FOR SELECT
  USING (auth.uid() = user_id);

-- Policies for auto_generated_tests
CREATE POLICY "System can manage tests"
  ON public.auto_generated_tests FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can view active tests"
  ON public.auto_generated_tests FOR SELECT
  USING (is_active = true);

-- Policies for test_execution_results
CREATE POLICY "System can insert test results"
  ON public.test_execution_results FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view test results"
  ON public.test_execution_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Indexes for performance
CREATE INDEX idx_failures_error_type ON public.generation_failures(error_type);
CREATE INDEX idx_failures_created_at ON public.generation_failures(created_at DESC);
CREATE INDEX idx_failures_severity ON public.generation_failures(severity);
CREATE INDEX idx_tests_active ON public.auto_generated_tests(is_active) WHERE is_active = true;
CREATE INDEX idx_test_results_test_id ON public.test_execution_results(test_id);
CREATE INDEX idx_test_results_executed_at ON public.test_execution_results(executed_at DESC);

-- Function to update test confidence based on results
CREATE OR REPLACE FUNCTION update_test_confidence()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.auto_generated_tests
  SET 
    confidence_score = CASE
      WHEN NEW.passed THEN LEAST(100, confidence_score + 5)
      ELSE GREATEST(0, confidence_score - 10)
    END,
    last_run_at = NEW.executed_at,
    run_count = run_count + 1,
    pass_count = pass_count + CASE WHEN NEW.passed THEN 1 ELSE 0 END,
    fail_count = fail_count + CASE WHEN NOT NEW.passed THEN 1 ELSE 0 END
  WHERE id = NEW.test_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_test_confidence_trigger
  AFTER INSERT ON public.test_execution_results
  FOR EACH ROW
  EXECUTE FUNCTION update_test_confidence();

-- Function to auto-generate test from repeated failures
CREATE OR REPLACE FUNCTION auto_generate_test_from_failure()
RETURNS TRIGGER AS $$
DECLARE
  failure_count INTEGER;
  test_exists BOOLEAN;
BEGIN
  -- Count how many times this error type occurred
  SELECT COUNT(*) INTO failure_count
  FROM public.generation_failures
  WHERE error_type = NEW.error_type
    AND created_at > now() - INTERVAL '7 days';
  
  -- If error occurred 3+ times and no test exists, create one
  IF failure_count >= 3 THEN
    SELECT EXISTS (
      SELECT 1 FROM public.auto_generated_tests
      WHERE test_name = 'regression_' || NEW.error_type
    ) INTO test_exists;
    
    IF NOT test_exists THEN
      INSERT INTO public.auto_generated_tests (
        test_name,
        test_type,
        test_prompt,
        expected_behavior,
        framework,
        created_from_failure_id,
        tags,
        confidence_score
      ) VALUES (
        'regression_' || NEW.error_type,
        'regression',
        NEW.user_request,
        jsonb_build_object(
          'shouldNotFail', true,
          'errorType', NEW.error_type,
          'minimumFiles', 1
        ),
        NEW.framework,
        NEW.id,
        ARRAY['auto-generated', 'regression', NEW.failure_category],
        75 -- Start with medium confidence
      );
      
      -- Mark failure as having generated a test
      UPDATE public.generation_failures
      SET test_generated = true
      WHERE id = NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_generate_test_trigger
  AFTER INSERT ON public.generation_failures
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_test_from_failure();