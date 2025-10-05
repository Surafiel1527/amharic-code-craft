-- Create table for storing database connection errors and AI analysis
CREATE TABLE IF NOT EXISTS public.database_connection_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  credential_id UUID REFERENCES public.database_credentials(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_context JSONB DEFAULT '{}'::jsonb,
  ai_analysis JSONB DEFAULT NULL,
  suggested_fixes JSONB DEFAULT '[]'::jsonb,
  fix_applied BOOLEAN DEFAULT false,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Create table for storing successful connection patterns
CREATE TABLE IF NOT EXISTS public.database_connection_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  configuration JSONB NOT NULL,
  success_count INTEGER DEFAULT 1,
  last_success_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  common_environment TEXT DEFAULT 'production',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create table for caching provider documentation
CREATE TABLE IF NOT EXISTS public.database_provider_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL UNIQUE,
  documentation JSONB NOT NULL,
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  cache_expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '7 days'),
  version TEXT DEFAULT '1.0'
);

-- Enable RLS
ALTER TABLE public.database_connection_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.database_connection_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.database_provider_docs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for database_connection_errors
CREATE POLICY "Users can view their own connection errors"
  ON public.database_connection_errors FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own connection errors"
  ON public.database_connection_errors FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own connection errors"
  ON public.database_connection_errors FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for database_connection_patterns
CREATE POLICY "Anyone can view connection patterns"
  ON public.database_connection_patterns FOR SELECT
  USING (true);

CREATE POLICY "System can manage connection patterns"
  ON public.database_connection_patterns FOR ALL
  USING (true);

-- RLS Policies for database_provider_docs
CREATE POLICY "Anyone can view provider documentation"
  ON public.database_provider_docs FOR SELECT
  USING (true);

CREATE POLICY "System can manage provider documentation"
  ON public.database_provider_docs FOR ALL
  USING (true);

-- Create indexes for better performance
CREATE INDEX idx_connection_errors_user_id ON public.database_connection_errors(user_id);
CREATE INDEX idx_connection_errors_credential_id ON public.database_connection_errors(credential_id);
CREATE INDEX idx_connection_patterns_provider ON public.database_connection_patterns(provider);
CREATE INDEX idx_provider_docs_provider ON public.database_provider_docs(provider);