-- Phase 4: Autonomous Testing & Quality System

-- Table for test suites
CREATE TABLE IF NOT EXISTS public.test_suites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id),
  suite_name TEXT NOT NULL,
  suite_type TEXT NOT NULL CHECK (suite_type IN ('unit', 'integration', 'e2e', 'performance', 'accessibility', 'visual')),
  test_framework TEXT DEFAULT 'vitest' CHECK (test_framework IN ('vitest', 'jest', 'cypress', 'playwright', 'lighthouse')),
  total_tests INTEGER DEFAULT 0,
  passing_tests INTEGER DEFAULT 0,
  failing_tests INTEGER DEFAULT 0,
  skipped_tests INTEGER DEFAULT 0,
  coverage_percentage NUMERIC DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  last_run_duration_ms INTEGER,
  is_active BOOLEAN DEFAULT true,
  auto_run_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table for individual test cases
CREATE TABLE IF NOT EXISTS public.test_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suite_id UUID REFERENCES public.test_suites(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  test_name TEXT NOT NULL,
  test_file_path TEXT NOT NULL,
  test_code TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'passed', 'failed', 'skipped', 'flaky')),
  execution_time_ms INTEGER,
  error_message TEXT,
  error_stack TEXT,
  assertions_count INTEGER DEFAULT 0,
  ai_generated BOOLEAN DEFAULT false,
  auto_fix_attempts INTEGER DEFAULT 0,
  confidence_score NUMERIC DEFAULT 0.5,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table for test execution runs
CREATE TABLE IF NOT EXISTS public.test_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id),
  suite_id UUID REFERENCES public.test_suites(id),
  run_type TEXT DEFAULT 'manual' CHECK (run_type IN ('manual', 'auto', 'ci_cd', 'pre_deployment', 'scheduled')),
  status TEXT DEFAULT 'running' CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  total_tests INTEGER DEFAULT 0,
  passed_tests INTEGER DEFAULT 0,
  failed_tests INTEGER DEFAULT 0,
  skipped_tests INTEGER DEFAULT 0,
  duration_ms INTEGER,
  coverage_data JSONB DEFAULT '{}',
  triggered_by TEXT DEFAULT 'user',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table for test generation requests
CREATE TABLE IF NOT EXISTS public.test_generation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id),
  file_path TEXT NOT NULL,
  source_code TEXT NOT NULL,
  test_type TEXT NOT NULL CHECK (test_type IN ('unit', 'integration', 'e2e')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
  generated_tests JSONB,
  tests_count INTEGER DEFAULT 0,
  ai_model TEXT DEFAULT 'gemini-2.5-flash',
  generation_time_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Table for test auto-fix operations
CREATE TABLE IF NOT EXISTS public.test_auto_fixes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  test_case_id UUID REFERENCES public.test_cases(id),
  original_test_code TEXT NOT NULL,
  fixed_test_code TEXT NOT NULL,
  failure_reason TEXT NOT NULL,
  fix_strategy TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'failed', 'reverted')),
  verification_status TEXT,
  ai_confidence NUMERIC DEFAULT 0,
  applied_at TIMESTAMPTZ,
  reverted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table for quality metrics tracking
CREATE TABLE IF NOT EXISTS public.quality_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id),
  metric_type TEXT NOT NULL CHECK (metric_type IN ('test_coverage', 'code_quality', 'performance', 'accessibility', 'security')),
  metric_value NUMERIC NOT NULL,
  metric_data JSONB DEFAULT '{}',
  threshold_met BOOLEAN DEFAULT true,
  trend TEXT CHECK (trend IN ('improving', 'declining', 'stable')),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table for test learning patterns
CREATE TABLE IF NOT EXISTS public.test_learning_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_name TEXT NOT NULL,
  pattern_type TEXT NOT NULL CHECK (pattern_type IN ('common_error', 'test_structure', 'assertion_pattern', 'mock_pattern')),
  pattern_code TEXT NOT NULL,
  success_rate NUMERIC DEFAULT 100,
  usage_count INTEGER DEFAULT 0,
  confidence_score NUMERIC DEFAULT 50,
  learned_from_tests INTEGER DEFAULT 1,
  contexts JSONB DEFAULT '[]',
  last_used_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_test_suites_user ON public.test_suites(user_id);
CREATE INDEX IF NOT EXISTS idx_test_suites_project ON public.test_suites(project_id);
CREATE INDEX IF NOT EXISTS idx_test_cases_suite ON public.test_cases(suite_id);
CREATE INDEX IF NOT EXISTS idx_test_cases_status ON public.test_cases(status);
CREATE INDEX IF NOT EXISTS idx_test_runs_user ON public.test_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_test_runs_status ON public.test_runs(status);
CREATE INDEX IF NOT EXISTS idx_test_generation_status ON public.test_generation_requests(status);
CREATE INDEX IF NOT EXISTS idx_quality_metrics_project ON public.quality_metrics(project_id);
CREATE INDEX IF NOT EXISTS idx_quality_metrics_type ON public.quality_metrics(metric_type);

-- RLS Policies
ALTER TABLE public.test_suites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_generation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_auto_fixes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_learning_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their test suites"
  ON public.test_suites FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage their test cases"
  ON public.test_cases FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage their test runs"
  ON public.test_runs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage their test generation"
  ON public.test_generation_requests FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage their test fixes"
  ON public.test_auto_fixes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view their quality metrics"
  ON public.quality_metrics FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view learning patterns"
  ON public.test_learning_patterns FOR SELECT
  USING (true);

CREATE POLICY "System can manage learning patterns"
  ON public.test_learning_patterns FOR ALL
  USING (true)
  WITH CHECK (true);