-- Create universal error patterns table for all error types
CREATE TABLE IF NOT EXISTS public.universal_error_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_category TEXT NOT NULL, -- 'deployment', 'runtime', 'typescript', 'api', 'database', 'build', 'ui', 'performance'
  error_subcategory TEXT, -- More specific categorization
  error_signature TEXT NOT NULL, -- Unique identifier for this error pattern
  error_pattern TEXT NOT NULL, -- The actual error message pattern
  
  -- Diagnostic information
  diagnosis JSONB NOT NULL, -- What's wrong
  root_cause TEXT NOT NULL, -- Technical reason
  
  -- Solution structure
  solution JSONB NOT NULL, -- { files: [], steps: [], verification: '', code_changes: [] }
  fix_type TEXT NOT NULL, -- 'code', 'config', 'dependency', 'architecture', 'data'
  
  -- Context and metadata
  affected_technologies JSONB DEFAULT '[]'::jsonb, -- ['react', 'typescript', 'vite', etc.]
  common_triggers JSONB DEFAULT '[]'::jsonb, -- What typically causes this
  related_errors JSONB DEFAULT '[]'::jsonb, -- Similar or cascading errors
  prevention_tips JSONB DEFAULT '[]'::jsonb,
  
  -- Learning metrics
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  confidence_score NUMERIC DEFAULT 0.5, -- 0-1 scale
  times_encountered INTEGER DEFAULT 1,
  
  -- Timestamps
  learned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  last_success_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Learning source
  learned_from_user_id UUID,
  learned_from_project_id UUID,
  
  CONSTRAINT unique_error_signature UNIQUE (error_category, error_signature)
);

-- Create index for fast error pattern lookup
CREATE INDEX idx_universal_error_patterns_category ON public.universal_error_patterns(error_category);
CREATE INDEX idx_universal_error_patterns_signature ON public.universal_error_patterns(error_signature);
CREATE INDEX idx_universal_error_patterns_confidence ON public.universal_error_patterns(confidence_score DESC);
CREATE INDEX idx_universal_error_patterns_success_rate ON public.universal_error_patterns((success_count::numeric / NULLIF(success_count + failure_count, 0)));

-- Create error fix feedback table to track what worked
CREATE TABLE IF NOT EXISTS public.error_fix_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_id UUID NOT NULL REFERENCES public.universal_error_patterns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  project_id UUID,
  
  -- Feedback
  fix_worked BOOLEAN NOT NULL,
  fix_applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_feedback TEXT,
  
  -- Context when fix was applied
  error_context JSONB,
  applied_solution JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_error_fix_feedback_pattern ON public.error_fix_feedback(pattern_id);
CREATE INDEX idx_error_fix_feedback_worked ON public.error_fix_feedback(fix_worked);

-- Function to update pattern confidence based on feedback
CREATE OR REPLACE FUNCTION public.update_pattern_confidence()
RETURNS TRIGGER AS $$
DECLARE
  total_attempts INTEGER;
  successful_attempts INTEGER;
  new_confidence NUMERIC;
BEGIN
  -- Get total attempts and successes for this pattern
  SELECT 
    success_count + failure_count,
    success_count
  INTO total_attempts, successful_attempts
  FROM public.universal_error_patterns
  WHERE id = NEW.pattern_id;
  
  -- Calculate new confidence (Bayesian approach with prior)
  IF total_attempts > 0 THEN
    new_confidence := (successful_attempts + 2.0) / (total_attempts + 4.0);
  ELSE
    new_confidence := 0.5;
  END IF;
  
  -- Update the pattern
  UPDATE public.universal_error_patterns
  SET 
    confidence_score = new_confidence,
    last_used_at = now(),
    last_success_at = CASE WHEN NEW.fix_worked THEN now() ELSE last_success_at END
  WHERE id = NEW.pattern_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_pattern_confidence
AFTER INSERT ON public.error_fix_feedback
FOR EACH ROW
EXECUTE FUNCTION public.update_pattern_confidence();

-- RLS Policies
ALTER TABLE public.universal_error_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_fix_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view error patterns"
  ON public.universal_error_patterns FOR SELECT
  USING (true);

CREATE POLICY "System can manage error patterns"
  ON public.universal_error_patterns FOR ALL
  USING (true);

CREATE POLICY "Users can submit feedback"
  ON public.error_fix_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their feedback"
  ON public.error_fix_feedback FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage feedback"
  ON public.error_fix_feedback FOR ALL
  USING (true);