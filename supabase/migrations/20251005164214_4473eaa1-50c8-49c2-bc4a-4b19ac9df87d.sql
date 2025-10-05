-- Create deployment_error_patterns table for AI learning
CREATE TABLE IF NOT EXISTS public.deployment_error_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL, -- vercel, netlify, etc.
  error_pattern TEXT NOT NULL,
  error_type TEXT NOT NULL,
  solution JSONB NOT NULL,
  diagnosis TEXT,
  prevention_tips JSONB,
  related_errors JSONB,
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  learned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deployment_error_patterns ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read patterns (they're general knowledge)
CREATE POLICY "Anyone can view deployment error patterns"
ON public.deployment_error_patterns
FOR SELECT
USING (true);

-- System can insert and update patterns
CREATE POLICY "System can manage deployment error patterns"
ON public.deployment_error_patterns
FOR ALL
USING (true);

-- Create index for fast pattern lookup
CREATE INDEX idx_deployment_patterns_error ON public.deployment_error_patterns(error_pattern);
CREATE INDEX idx_deployment_patterns_provider ON public.deployment_error_patterns(provider);
CREATE INDEX idx_deployment_patterns_success ON public.deployment_error_patterns(success_count DESC);