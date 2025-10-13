-- Create ai_prompts table for prompt evolution system
CREATE TABLE IF NOT EXISTS public.ai_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_text TEXT NOT NULL,
  prompt_type TEXT NOT NULL,
  success_rate NUMERIC DEFAULT 0 CHECK (success_rate >= 0 AND success_rate <= 100),
  success_count INTEGER DEFAULT 0,
  avg_quality_score NUMERIC DEFAULT 0 CHECK (avg_quality_score >= 0 AND avg_quality_score <= 100),
  times_used INTEGER DEFAULT 0,
  user_satisfaction NUMERIC DEFAULT 0 CHECK (user_satisfaction >= 0 AND user_satisfaction <= 10),
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;

-- Admins can manage prompts
CREATE POLICY "Admins can manage prompts"
ON public.ai_prompts
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- System can update prompt metrics
CREATE POLICY "System can update prompt metrics"
ON public.ai_prompts
FOR UPDATE
USING (true);

-- Anyone can view prompts
CREATE POLICY "Anyone can view prompts"
ON public.ai_prompts
FOR SELECT
USING (true);

-- Create index for performance
CREATE INDEX idx_ai_prompts_performance ON public.ai_prompts(success_rate DESC, times_used DESC);
CREATE INDEX idx_ai_prompts_type ON public.ai_prompts(prompt_type);
CREATE INDEX idx_ai_prompts_last_used ON public.ai_prompts(last_used_at DESC);

-- Add some sample prompts for testing
INSERT INTO public.ai_prompts (prompt_text, prompt_type, success_rate, avg_quality_score, times_used, user_satisfaction) VALUES
('Generate a React component for...', 'component_generation', 85, 82, 150, 8.2),
('Create a responsive layout with...', 'layout_generation', 72, 68, 95, 6.8),
('Implement authentication using...', 'authentication', 91, 89, 203, 9.1),
('Build a dashboard that shows...', 'dashboard_generation', 65, 61, 47, 5.9),
('Design a form with validation...', 'form_generation', 88, 85, 178, 8.5);

COMMENT ON TABLE public.ai_prompts IS 'Stores AI prompts with performance tracking for autonomous evolution';