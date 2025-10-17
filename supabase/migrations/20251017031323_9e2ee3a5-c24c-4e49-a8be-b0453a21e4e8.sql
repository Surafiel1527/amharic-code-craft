-- ============================================
-- MISSING TABLES FOR AUTONOMOUS AGENT SYSTEM
-- ============================================

-- 1. User Behavior Analytics Table
-- Tracks comprehensive user interaction patterns for intelligent decision-making
CREATE TABLE IF NOT EXISTS public.user_behavior_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  
  -- Captured behavior data
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  business_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Metadata
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Decision Feedback Table
-- Tracks user choices to improve future decision-making
CREATE TABLE IF NOT EXISTS public.decision_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES public.decision_logs(id) ON DELETE CASCADE,
  
  -- Feedback data
  chosen_option TEXT NOT NULL,
  was_correct BOOLEAN NOT NULL,
  feedback_notes TEXT,
  
  -- Learning metrics
  time_to_decide_seconds INTEGER,
  user_confidence INTEGER CHECK (user_confidence BETWEEN 1 AND 10),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_user_behavior_user ON public.user_behavior_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_behavior_session ON public.user_behavior_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_user_behavior_captured_at ON public.user_behavior_analytics(captured_at DESC);

CREATE INDEX IF NOT EXISTS idx_decision_feedback_decision ON public.decision_feedback(decision_id);
CREATE INDEX IF NOT EXISTS idx_decision_feedback_created ON public.decision_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_decision_feedback_correct ON public.decision_feedback(was_correct);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.user_behavior_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_feedback ENABLE ROW LEVEL SECURITY;

-- User behavior analytics policies
CREATE POLICY "Users can view their own behavior analytics"
  ON public.user_behavior_analytics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert behavior analytics"
  ON public.user_behavior_analytics FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can insert their own behavior analytics"
  ON public.user_behavior_analytics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Decision feedback policies
CREATE POLICY "Users can view feedback for their decisions"
  ON public.decision_feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.decision_logs
      WHERE decision_logs.id = decision_feedback.decision_id
      AND decision_logs.user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage decision feedback"
  ON public.decision_feedback FOR ALL
  USING (true) WITH CHECK (true);

-- ============================================
-- ENABLE REALTIME
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.user_behavior_analytics;
ALTER PUBLICATION supabase_realtime ADD TABLE public.decision_feedback;

-- ============================================
-- CLEANUP FUNCTIONS
-- ============================================

-- Cleanup old behavior analytics (keep 90 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_behavior_analytics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.user_behavior_analytics
  WHERE captured_at < now() - interval '90 days';
END;
$$;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Autonomous Agent Tables Created Successfully';
  RAISE NOTICE '📊 Created: user_behavior_analytics';
  RAISE NOTICE '📊 Created: decision_feedback';
  RAISE NOTICE '🔒 RLS Policies Applied';
  RAISE NOTICE '📡 Realtime Enabled';
END $$;