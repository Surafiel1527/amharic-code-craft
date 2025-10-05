-- Create table for code reviews (if not exists)
CREATE TABLE IF NOT EXISTS public.code_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  filename TEXT NOT NULL,
  language TEXT NOT NULL,
  code_length INTEGER NOT NULL,
  overall_score INTEGER NOT NULL,
  grade TEXT NOT NULL,
  security_score INTEGER NOT NULL,
  performance_score INTEGER NOT NULL,
  maintainability_score INTEGER NOT NULL,
  improvements_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for debug sessions (if not exists)
CREATE TABLE IF NOT EXISTS public.debug_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  error_message TEXT NOT NULL,
  error_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  solutions_count INTEGER NOT NULL DEFAULT 0,
  language TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for security scans (if not exists)
CREATE TABLE IF NOT EXISTS public.security_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  language TEXT NOT NULL,
  framework TEXT NOT NULL,
  code_length INTEGER NOT NULL,
  dependencies_count INTEGER NOT NULL DEFAULT 0,
  overall_risk TEXT NOT NULL,
  risk_score INTEGER NOT NULL,
  vulnerabilities_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.code_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debug_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_scans ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist for code_reviews
DROP POLICY IF EXISTS "Users can view their own code reviews" ON public.code_reviews;
DROP POLICY IF EXISTS "System can insert code reviews" ON public.code_reviews;

-- Create policies for code_reviews
CREATE POLICY "Users can view their own code reviews"
  ON public.code_reviews
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert code reviews"
  ON public.code_reviews
  FOR INSERT
  WITH CHECK (true);

-- Drop existing policies if they exist for debug_sessions
DROP POLICY IF EXISTS "Users can view their own debug sessions" ON public.debug_sessions;
DROP POLICY IF EXISTS "System can insert debug sessions" ON public.debug_sessions;

-- Create policies for debug_sessions
CREATE POLICY "Users can view their own debug sessions"
  ON public.debug_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert debug sessions"
  ON public.debug_sessions
  FOR INSERT
  WITH CHECK (true);

-- Drop existing policies if they exist for security_scans
DROP POLICY IF EXISTS "Users can view their own security scans" ON public.security_scans;
DROP POLICY IF EXISTS "System can insert security scans" ON public.security_scans;

-- Create policies for security_scans
CREATE POLICY "Users can view their own security scans"
  ON public.security_scans
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert security scans"
  ON public.security_scans
  FOR INSERT
  WITH CHECK (true);

-- Create indexes for new tables
CREATE INDEX IF NOT EXISTS idx_code_reviews_user_id ON public.code_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_code_reviews_created_at ON public.code_reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_debug_sessions_user_id ON public.debug_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_debug_sessions_created_at ON public.debug_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_scans_user_id ON public.security_scans(user_id);
CREATE INDEX IF NOT EXISTS idx_security_scans_created_at ON public.security_scans(created_at DESC);