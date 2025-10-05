-- Create validation_results table for learning system
CREATE TABLE IF NOT EXISTS public.validation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  code_hash TEXT NOT NULL,
  language TEXT NOT NULL,
  validation_type TEXT NOT NULL, -- 'syntax', 'security', 'performance', 'best_practices'
  status TEXT NOT NULL, -- 'pass', 'warning', 'fail'
  score INTEGER NOT NULL,
  issues JSONB DEFAULT '[]'::jsonb,
  auto_fixed BOOLEAN DEFAULT false,
  fix_applied JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT validation_results_status_check CHECK (status IN ('pass', 'warning', 'fail'))
);

-- Create code_analysis_cache table for sophisticated analysis results
CREATE TABLE IF NOT EXISTS public.code_analysis_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash TEXT NOT NULL UNIQUE,
  language TEXT NOT NULL,
  eslint_results JSONB DEFAULT NULL,
  typescript_diagnostics JSONB DEFAULT NULL,
  bundle_size_kb NUMERIC DEFAULT NULL,
  complexity_score INTEGER DEFAULT NULL,
  performance_metrics JSONB DEFAULT NULL,
  analyzed_at TIMESTAMPTZ DEFAULT now(),
  cache_expires_at TIMESTAMPTZ DEFAULT (now() + interval '24 hours')
);

-- Create generated_tests table for automated test generation
CREATE TABLE IF NOT EXISTS public.generated_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  source_code TEXT NOT NULL,
  test_code TEXT NOT NULL,
  test_framework TEXT NOT NULL, -- 'vitest', 'jest', 'playwright'
  test_type TEXT NOT NULL, -- 'unit', 'integration', 'e2e'
  coverage_percentage NUMERIC DEFAULT NULL,
  execution_status TEXT DEFAULT 'pending', -- 'pending', 'passed', 'failed'
  execution_results JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create auto_fix_suggestions table
CREATE TABLE IF NOT EXISTS public.auto_fix_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  validation_result_id UUID REFERENCES public.validation_results(id),
  issue_type TEXT NOT NULL,
  issue_description TEXT NOT NULL,
  original_code TEXT NOT NULL,
  fixed_code TEXT NOT NULL,
  fix_explanation TEXT NOT NULL,
  confidence_score NUMERIC DEFAULT 0.8,
  applied BOOLEAN DEFAULT false,
  applied_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create validation_patterns table for learning
CREATE TABLE IF NOT EXISTS public.validation_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_type TEXT NOT NULL,
  language TEXT NOT NULL,
  issue_signature TEXT NOT NULL UNIQUE, -- Hash of the issue pattern
  fix_strategy JSONB NOT NULL,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  confidence_score NUMERIC DEFAULT 0.5,
  last_used_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create build_quality_gates table
CREATE TABLE IF NOT EXISTS public.build_quality_gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID DEFAULT NULL,
  min_code_quality_score INTEGER DEFAULT 70,
  max_security_issues INTEGER DEFAULT 0,
  max_critical_issues INTEGER DEFAULT 0,
  require_tests BOOLEAN DEFAULT false,
  min_test_coverage NUMERIC DEFAULT 0,
  block_on_fail BOOLEAN DEFAULT true,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.validation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_analysis_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_fix_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validation_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_quality_gates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for validation_results
CREATE POLICY "Users can manage their validation results"
ON public.validation_results
FOR ALL
USING (auth.uid() = user_id);

-- RLS Policies for code_analysis_cache
CREATE POLICY "Anyone can read analysis cache"
ON public.code_analysis_cache
FOR SELECT
USING (true);

CREATE POLICY "System can manage analysis cache"
ON public.code_analysis_cache
FOR ALL
USING (true);

-- RLS Policies for generated_tests
CREATE POLICY "Users can manage their tests"
ON public.generated_tests
FOR ALL
USING (auth.uid() = user_id);

-- RLS Policies for auto_fix_suggestions
CREATE POLICY "Users can manage their fix suggestions"
ON public.auto_fix_suggestions
FOR ALL
USING (auth.uid() = user_id);

-- RLS Policies for validation_patterns
CREATE POLICY "Anyone can read validation patterns"
ON public.validation_patterns
FOR SELECT
USING (true);

CREATE POLICY "System can manage validation patterns"
ON public.validation_patterns
FOR ALL
USING (true);

-- RLS Policies for build_quality_gates
CREATE POLICY "Users can manage their quality gates"
ON public.build_quality_gates
FOR ALL
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_validation_results_user_id ON public.validation_results(user_id);
CREATE INDEX idx_validation_results_code_hash ON public.validation_results(code_hash);
CREATE INDEX idx_code_analysis_cache_hash ON public.code_analysis_cache(code_hash);
CREATE INDEX idx_generated_tests_user_id ON public.generated_tests(user_id);
CREATE INDEX idx_auto_fix_suggestions_validation_id ON public.auto_fix_suggestions(validation_result_id);
CREATE INDEX idx_validation_patterns_signature ON public.validation_patterns(issue_signature);
CREATE INDEX idx_build_quality_gates_user_id ON public.build_quality_gates(user_id);