-- AI Code Review Tables
CREATE TABLE IF NOT EXISTS public.code_review_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  file_path TEXT NOT NULL,
  code_content TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'typescript',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.code_review_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.code_review_sessions(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  suggestion_type TEXT NOT NULL, -- 'bug', 'performance', 'style', 'security', 'best-practice'
  severity TEXT NOT NULL, -- 'critical', 'warning', 'info'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  current_code TEXT NOT NULL,
  suggested_fix TEXT NOT NULL,
  explanation TEXT NOT NULL,
  accepted BOOLEAN DEFAULT false,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.code_review_learnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  suggestion_id UUID REFERENCES public.code_review_suggestions(id) ON DELETE SET NULL,
  pattern_type TEXT NOT NULL,
  pattern_description TEXT NOT NULL,
  times_suggested INTEGER DEFAULT 1,
  times_accepted INTEGER DEFAULT 0,
  acceptance_rate NUMERIC DEFAULT 0,
  confidence_score NUMERIC DEFAULT 50,
  last_suggested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_code_review_sessions_user ON public.code_review_sessions(user_id);
CREATE INDEX idx_code_review_suggestions_session ON public.code_review_suggestions(session_id);
CREATE INDEX idx_code_review_suggestions_accepted ON public.code_review_suggestions(accepted);
CREATE INDEX idx_code_review_learnings_user ON public.code_review_learnings(user_id);
CREATE INDEX idx_code_review_learnings_pattern ON public.code_review_learnings(pattern_type);

-- RLS Policies
ALTER TABLE public.code_review_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_review_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_review_learnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own code review sessions"
  ON public.code_review_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own code review sessions"
  ON public.code_review_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view suggestions from own sessions"
  ON public.code_review_suggestions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.code_review_sessions
      WHERE id = session_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create suggestions for own sessions"
  ON public.code_review_suggestions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.code_review_sessions
      WHERE id = session_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update suggestions from own sessions"
  ON public.code_review_suggestions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.code_review_sessions
      WHERE id = session_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own code review learnings"
  ON public.code_review_learnings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own code review learnings"
  ON public.code_review_learnings FOR ALL
  USING (auth.uid() = user_id);

-- Function to update learning patterns when suggestions are accepted
CREATE OR REPLACE FUNCTION public.update_code_review_learning()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.accepted = true AND OLD.accepted = false THEN
    -- Update or create learning pattern
    INSERT INTO public.code_review_learnings (
      user_id,
      suggestion_id,
      pattern_type,
      pattern_description,
      times_accepted,
      acceptance_rate,
      confidence_score
    )
    SELECT 
      s.user_id,
      NEW.id,
      NEW.suggestion_type,
      NEW.title,
      1,
      100,
      75
    FROM public.code_review_sessions s
    WHERE s.id = NEW.session_id
    ON CONFLICT (user_id, pattern_type, pattern_description) 
    DO UPDATE SET
      times_accepted = public.code_review_learnings.times_accepted + 1,
      acceptance_rate = (public.code_review_learnings.times_accepted + 1.0) / (public.code_review_learnings.times_suggested + 1.0) * 100,
      confidence_score = LEAST(100, public.code_review_learnings.confidence_score + 5),
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_code_review_learning
  AFTER UPDATE ON public.code_review_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_code_review_learning();