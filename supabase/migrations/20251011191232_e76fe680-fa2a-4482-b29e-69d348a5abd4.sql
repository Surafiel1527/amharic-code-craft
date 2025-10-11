-- AGI/ASI Self-Correcting System - Database Schema

-- Decision Logs: Track every AI decision made
CREATE TABLE IF NOT EXISTS public.decision_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.ai_generation_jobs(id) ON DELETE CASCADE,
  
  -- Decision details
  decision_type TEXT NOT NULL, -- 'classification', 'execution_path', 'code_generation', 'meta_response'
  decision_input JSONB NOT NULL, -- What the AI was analyzing
  decision_output JSONB NOT NULL, -- What the AI decided
  confidence_score NUMERIC DEFAULT 0.5, -- AI's confidence in this decision
  
  -- Context
  user_request TEXT NOT NULL,
  classified_as TEXT NOT NULL, -- 'meta_request', 'code_modification', 'html_website', 'feature_generation'
  intent_detected TEXT,
  complexity_detected TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Metadata
  model_used TEXT,
  processing_time_ms INTEGER,
  context_used JSONB DEFAULT '{}'::jsonb
);

-- Decision Outcomes: Track whether decisions were correct
CREATE TABLE IF NOT EXISTS public.decision_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID REFERENCES public.decision_logs(id) ON DELETE CASCADE,
  
  -- Outcome tracking
  was_correct BOOLEAN DEFAULT NULL, -- NULL = unknown, TRUE = correct, FALSE = wrong
  actual_intent TEXT, -- What user actually wanted
  user_feedback TEXT, -- Explicit user feedback
  correction_needed BOOLEAN DEFAULT false,
  
  -- Detection method
  detected_by TEXT, -- 'user_complaint', 'outcome_mismatch', 'validation_failure', 'manual_review'
  detection_confidence NUMERIC DEFAULT 0.5,
  
  -- Impact
  error_severity TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  user_satisfaction_score INTEGER, -- 1-5 scale
  
  -- Timestamps
  detected_at TIMESTAMPTZ DEFAULT now(),
  corrected_at TIMESTAMPTZ,
  
  -- Metadata
  symptoms JSONB DEFAULT '[]'::jsonb, -- Signs that something went wrong
  actual_outcome JSONB,
  expected_outcome JSONB
);

-- Misclassification Patterns: Learn from mistakes
CREATE TABLE IF NOT EXISTS public.misclassification_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Pattern details
  pattern_name TEXT NOT NULL UNIQUE,
  pattern_type TEXT NOT NULL, -- 'classification_error', 'execution_error', 'understanding_error'
  
  -- What went wrong
  wrong_classification TEXT NOT NULL,
  correct_classification TEXT NOT NULL,
  common_keywords JSONB DEFAULT '[]'::jsonb,
  context_indicators JSONB DEFAULT '[]'::jsonb,
  
  -- Learning metrics
  occurrences INTEGER DEFAULT 1,
  confidence_score NUMERIC DEFAULT 0.5,
  success_rate NUMERIC DEFAULT 0,
  times_corrected INTEGER DEFAULT 0,
  
  -- Example cases
  example_requests JSONB DEFAULT '[]'::jsonb,
  
  -- Fix strategy
  correction_strategy JSONB NOT NULL,
  auto_fix_code TEXT,
  
  -- Timestamps
  first_seen_at TIMESTAMPTZ DEFAULT now(),
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  last_corrected_at TIMESTAMPTZ,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  validated BOOLEAN DEFAULT false
);

-- Confidence Scores: Track AI confidence over time
CREATE TABLE IF NOT EXISTS public.confidence_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- What we're tracking confidence for
  classification_type TEXT NOT NULL, -- 'meta_request', 'code_modification', etc.
  keyword_pattern TEXT NOT NULL,
  
  -- Confidence metrics
  initial_confidence NUMERIC NOT NULL,
  current_confidence NUMERIC NOT NULL,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  total_attempts INTEGER DEFAULT 0,
  
  -- Learning data
  successful_contexts JSONB DEFAULT '[]'::jsonb,
  failed_contexts JSONB DEFAULT '[]'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ
);

-- Auto Corrections: Track automatic fixes
CREATE TABLE IF NOT EXISTS public.auto_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- What was corrected
  original_decision_id UUID REFERENCES public.decision_logs(id) ON DELETE CASCADE,
  original_classification TEXT NOT NULL,
  corrected_classification TEXT NOT NULL,
  
  -- How it was corrected
  correction_method TEXT NOT NULL, -- 'pattern_match', 'reflection', 'user_feedback', 'outcome_analysis'
  correction_confidence NUMERIC DEFAULT 0.5,
  pattern_id UUID REFERENCES public.misclassification_patterns(id),
  
  -- Did it work?
  was_successful BOOLEAN DEFAULT NULL,
  validation_result JSONB,
  
  -- Re-execution details
  re_executed BOOLEAN DEFAULT false,
  re_execution_result JSONB,
  
  -- Timestamps
  corrected_at TIMESTAMPTZ DEFAULT now(),
  validated_at TIMESTAMPTZ,
  
  -- Metadata
  correction_reasoning TEXT,
  user_id UUID NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_decision_logs_user ON public.decision_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_decision_logs_conversation ON public.decision_logs(conversation_id);
CREATE INDEX IF NOT EXISTS idx_decision_logs_classified_as ON public.decision_logs(classified_as);
CREATE INDEX IF NOT EXISTS idx_decision_logs_created ON public.decision_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_decision_outcomes_decision ON public.decision_outcomes(decision_id);
CREATE INDEX IF NOT EXISTS idx_decision_outcomes_correct ON public.decision_outcomes(was_correct);
CREATE INDEX IF NOT EXISTS idx_decision_outcomes_severity ON public.decision_outcomes(error_severity);

CREATE INDEX IF NOT EXISTS idx_misclassification_patterns_type ON public.misclassification_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_misclassification_patterns_active ON public.misclassification_patterns(is_active);
CREATE INDEX IF NOT EXISTS idx_misclassification_patterns_confidence ON public.misclassification_patterns(confidence_score DESC);

CREATE INDEX IF NOT EXISTS idx_confidence_scores_type ON public.confidence_scores(classification_type);
CREATE INDEX IF NOT EXISTS idx_confidence_scores_updated ON public.confidence_scores(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_auto_corrections_decision ON public.auto_corrections(original_decision_id);
CREATE INDEX IF NOT EXISTS idx_auto_corrections_successful ON public.auto_corrections(was_successful);

-- RLS Policies
ALTER TABLE public.decision_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.misclassification_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.confidence_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_corrections ENABLE ROW LEVEL SECURITY;

-- Users can view their own decision logs
CREATE POLICY "Users can view own decision logs" ON public.decision_logs
  FOR SELECT USING (auth.uid() = user_id);

-- System can manage all decision logs
CREATE POLICY "System can manage decision logs" ON public.decision_logs
  FOR ALL USING (true) WITH CHECK (true);

-- Users can view outcomes for their decisions
CREATE POLICY "Users can view own outcomes" ON public.decision_outcomes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.decision_logs
      WHERE decision_logs.id = decision_outcomes.decision_id
      AND decision_logs.user_id = auth.uid()
    )
  );

-- System can manage outcomes
CREATE POLICY "System can manage outcomes" ON public.decision_outcomes
  FOR ALL USING (true) WITH CHECK (true);

-- Everyone can view active patterns (for learning)
CREATE POLICY "Anyone can view active patterns" ON public.misclassification_patterns
  FOR SELECT USING (is_active = true);

-- System can manage patterns
CREATE POLICY "System can manage patterns" ON public.misclassification_patterns
  FOR ALL USING (true) WITH CHECK (true);

-- Everyone can view confidence scores (for transparency)
CREATE POLICY "Anyone can view confidence scores" ON public.confidence_scores
  FOR SELECT USING (true);

-- System can manage confidence scores
CREATE POLICY "System can manage confidence scores" ON public.confidence_scores
  FOR ALL USING (true) WITH CHECK (true);

-- Users can view their own corrections
CREATE POLICY "Users can view own corrections" ON public.auto_corrections
  FOR SELECT USING (auth.uid() = user_id);

-- System can manage corrections
CREATE POLICY "System can manage corrections" ON public.auto_corrections
  FOR ALL USING (true) WITH CHECK (true);

-- Function to update confidence scores based on outcomes
CREATE OR REPLACE FUNCTION public.update_decision_confidence()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.was_correct IS NOT NULL THEN
    -- Update the original decision log
    UPDATE public.decision_logs
    SET confidence_score = CASE
      WHEN NEW.was_correct THEN LEAST(1.0, confidence_score + 0.1)
      ELSE GREATEST(0.0, confidence_score - 0.2)
    END
    WHERE id = NEW.decision_id;
    
    -- Update confidence scores table
    INSERT INTO public.confidence_scores (
      classification_type,
      keyword_pattern,
      initial_confidence,
      current_confidence,
      success_count,
      failure_count,
      total_attempts
    )
    SELECT 
      dl.classified_as,
      dl.intent_detected,
      dl.confidence_score,
      CASE WHEN NEW.was_correct 
        THEN LEAST(1.0, dl.confidence_score + 0.1)
        ELSE GREATEST(0.0, dl.confidence_score - 0.2)
      END,
      CASE WHEN NEW.was_correct THEN 1 ELSE 0 END,
      CASE WHEN NEW.was_correct THEN 0 ELSE 1 END,
      1
    FROM public.decision_logs dl
    WHERE dl.id = NEW.decision_id
    ON CONFLICT (classification_type, keyword_pattern)
    DO UPDATE SET
      current_confidence = CASE WHEN NEW.was_correct
        THEN LEAST(1.0, confidence_scores.current_confidence + 0.05)
        ELSE GREATEST(0.0, confidence_scores.current_confidence - 0.1)
      END,
      success_count = confidence_scores.success_count + CASE WHEN NEW.was_correct THEN 1 ELSE 0 END,
      failure_count = confidence_scores.failure_count + CASE WHEN NEW.was_correct THEN 0 ELSE 1 END,
      total_attempts = confidence_scores.total_attempts + 1,
      updated_at = now(),
      last_success_at = CASE WHEN NEW.was_correct THEN now() ELSE confidence_scores.last_success_at END,
      last_failure_at = CASE WHEN NEW.was_correct THEN confidence_scores.last_failure_at ELSE now() END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_decision_outcome_update
  AFTER INSERT OR UPDATE ON public.decision_outcomes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_decision_confidence();