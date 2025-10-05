-- Phase 3: Enterprise Intelligence Tables

-- Orchestration runs tracking
CREATE TABLE IF NOT EXISTS public.orchestration_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  task TEXT NOT NULL,
  execution_plan JSONB NOT NULL DEFAULT '[]'::jsonb,
  results JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary TEXT,
  total_steps INTEGER DEFAULT 0,
  completed_steps INTEGER DEFAULT 0,
  success_rate NUMERIC DEFAULT 100,
  total_time INTEGER DEFAULT 0,
  status TEXT DEFAULT 'running',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Learned patterns from user behavior
CREATE TABLE IF NOT EXISTS public.learned_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  pattern_name TEXT NOT NULL,
  pattern_type TEXT NOT NULL,
  pattern_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence NUMERIC DEFAULT 50,
  usage_count INTEGER DEFAULT 1,
  success_rate NUMERIC DEFAULT 100,
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Proactive AI insights and suggestions
CREATE TABLE IF NOT EXISTS public.proactive_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  insight_type TEXT NOT NULL,
  suggestions JSONB NOT NULL DEFAULT '[]'::jsonb,
  based_on JSONB DEFAULT '{}'::jsonb,
  priority TEXT DEFAULT 'medium',
  acted_upon BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Team AI collaboration sessions
CREATE TABLE IF NOT EXISTS public.team_ai_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID,
  session_name TEXT NOT NULL,
  created_by UUID NOT NULL,
  participants JSONB DEFAULT '[]'::jsonb,
  shared_context JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.orchestration_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learned_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proactive_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_ai_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for orchestration_runs
CREATE POLICY "Users can manage their orchestration runs"
  ON public.orchestration_runs
  FOR ALL
  USING (auth.uid() = user_id);

-- RLS Policies for learned_patterns
CREATE POLICY "Users can view their learned patterns"
  ON public.learned_patterns
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage learned patterns"
  ON public.learned_patterns
  FOR ALL
  USING (true);

-- RLS Policies for proactive_insights
CREATE POLICY "Users can manage their proactive insights"
  ON public.proactive_insights
  FOR ALL
  USING (auth.uid() = user_id);

-- RLS Policies for team_ai_sessions
CREATE POLICY "Session creators can manage their sessions"
  ON public.team_ai_sessions
  FOR ALL
  USING (auth.uid() = created_by);

CREATE POLICY "Session participants can view"
  ON public.team_ai_sessions
  FOR SELECT
  USING (
    auth.uid() = created_by OR 
    participants ? auth.uid()::text
  );

-- Indexes for performance
CREATE INDEX idx_orchestration_runs_user_id ON public.orchestration_runs(user_id);
CREATE INDEX idx_orchestration_runs_status ON public.orchestration_runs(status);
CREATE INDEX idx_learned_patterns_user_id ON public.learned_patterns(user_id);
CREATE INDEX idx_learned_patterns_type ON public.learned_patterns(pattern_type);
CREATE INDEX idx_proactive_insights_user_id ON public.proactive_insights(user_id);
CREATE INDEX idx_team_ai_sessions_workspace ON public.team_ai_sessions(workspace_id);