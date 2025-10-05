-- Phase 3B: Real-Time Collaboration Schema

-- Team AI sessions
CREATE TABLE IF NOT EXISTS public.team_ai_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID,
  session_name TEXT NOT NULL,
  created_by UUID NOT NULL,
  is_active BOOLEAN DEFAULT true,
  participants JSONB DEFAULT '[]'::jsonb,
  shared_context JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);

-- Collaborative messages
CREATE TABLE IF NOT EXISTS public.collaborative_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.team_ai_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  code_block TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User presence tracking
CREATE TABLE IF NOT EXISTS public.user_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_id UUID REFERENCES public.team_ai_sessions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'idle', 'away')),
  current_file TEXT,
  cursor_position JSONB,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Team learning contributions
CREATE TABLE IF NOT EXISTS public.team_learning_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID,
  user_id UUID NOT NULL,
  contribution_type TEXT NOT NULL,
  pattern_learned TEXT NOT NULL,
  impact_score NUMERIC DEFAULT 0,
  times_reused INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Phase 3C: Integration Ecosystem Schema

-- External integrations
CREATE TABLE IF NOT EXISTS public.external_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  integration_type TEXT NOT NULL,
  integration_name TEXT NOT NULL,
  credentials JSONB NOT NULL,
  config JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  last_tested_at TIMESTAMPTZ,
  test_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Integration usage logs
CREATE TABLE IF NOT EXISTS public.integration_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES public.external_integrations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  request_data JSONB,
  response_data JSONB,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Custom AI plugins
CREATE TABLE IF NOT EXISTS public.ai_plugins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL,
  plugin_name TEXT NOT NULL,
  description TEXT,
  plugin_code TEXT NOT NULL,
  config_schema JSONB NOT NULL,
  is_public BOOLEAN DEFAULT false,
  install_count INTEGER DEFAULT 0,
  rating NUMERIC,
  version TEXT NOT NULL DEFAULT '1.0.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Plugin installations
CREATE TABLE IF NOT EXISTS public.plugin_installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plugin_id UUID NOT NULL REFERENCES public.ai_plugins(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  config JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  installed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(plugin_id, user_id)
);

-- Phase 3D: Advanced Orchestration Schema

-- AI workflows
CREATE TABLE IF NOT EXISTS public.ai_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  workflow_name TEXT NOT NULL,
  description TEXT,
  workflow_steps JSONB NOT NULL,
  trigger_type TEXT NOT NULL DEFAULT 'manual' CHECK (trigger_type IN ('manual', 'scheduled', 'event')),
  trigger_config JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Workflow executions
CREATE TABLE IF NOT EXISTS public.workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.ai_workflows(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  current_step INTEGER DEFAULT 0,
  total_steps INTEGER NOT NULL,
  execution_data JSONB DEFAULT '{}'::jsonb,
  results JSONB,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Multi-model orchestration logs
CREATE TABLE IF NOT EXISTS public.multi_model_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  model_used TEXT NOT NULL,
  input_data JSONB NOT NULL,
  output_data JSONB,
  duration_ms INTEGER,
  cost_estimate NUMERIC,
  success BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pipeline optimizations
CREATE TABLE IF NOT EXISTS public.pipeline_optimizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.ai_workflows(id) ON DELETE CASCADE,
  optimization_type TEXT NOT NULL,
  before_performance JSONB NOT NULL,
  after_performance JSONB NOT NULL,
  improvement_percentage NUMERIC,
  applied BOOLEAN DEFAULT false,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.team_ai_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborative_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_learning_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_plugins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plugin_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.multi_model_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_optimizations ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Phase 3B (Collaboration)

CREATE POLICY "Team members can manage their sessions"
  ON public.team_ai_sessions
  FOR ALL
  USING (
    created_by = auth.uid() OR
    (participants::jsonb ? auth.uid()::text)
  );

CREATE POLICY "Session participants can view messages"
  ON public.collaborative_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_ai_sessions
      WHERE id = session_id
      AND (created_by = auth.uid() OR participants::jsonb ? auth.uid()::text)
    )
  );

CREATE POLICY "Session participants can send messages"
  ON public.collaborative_messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.team_ai_sessions
      WHERE id = session_id
      AND (created_by = auth.uid() OR participants::jsonb ? auth.uid()::text)
    )
  );

CREATE POLICY "Users can manage their presence"
  ON public.user_presence
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view team contributions"
  ON public.team_learning_contributions
  FOR SELECT
  USING (
    workspace_id IS NULL OR
    is_workspace_member(workspace_id, auth.uid())
  );

CREATE POLICY "Users can create contributions"
  ON public.team_learning_contributions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies: Phase 3C (Integrations)

CREATE POLICY "Users can manage their integrations"
  ON public.external_integrations
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their integration logs"
  ON public.integration_usage_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can create integration logs"
  ON public.integration_usage_logs
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view public plugins"
  ON public.ai_plugins
  FOR SELECT
  USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "Users can manage their plugins"
  ON public.ai_plugins
  FOR ALL
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can manage their plugin installations"
  ON public.plugin_installations
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies: Phase 3D (Orchestration)

CREATE POLICY "Users can manage their workflows"
  ON public.ai_workflows
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their workflow executions"
  ON public.workflow_executions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage workflow executions"
  ON public.workflow_executions
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view their model logs"
  ON public.multi_model_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workflow_executions
      WHERE id = execution_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "System can create model logs"
  ON public.multi_model_logs
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view their pipeline optimizations"
  ON public.pipeline_optimizations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_workflows
      WHERE id = workflow_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage pipeline optimizations"
  ON public.pipeline_optimizations
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_team_sessions_active ON public.team_ai_sessions(is_active, created_at DESC);
CREATE INDEX idx_collaborative_messages_session ON public.collaborative_messages(session_id, created_at DESC);
CREATE INDEX idx_user_presence_session ON public.user_presence(session_id, last_seen_at DESC);
CREATE INDEX idx_integrations_user ON public.external_integrations(user_id, is_active);
CREATE INDEX idx_integration_logs_integration ON public.integration_usage_logs(integration_id, created_at DESC);
CREATE INDEX idx_plugins_public ON public.ai_plugins(is_public, rating DESC);
CREATE INDEX idx_workflows_user ON public.ai_workflows(user_id, is_active);
CREATE INDEX idx_workflow_executions_workflow ON public.workflow_executions(workflow_id, started_at DESC);
CREATE INDEX idx_workflow_executions_status ON public.workflow_executions(status, started_at DESC);

-- Enable realtime for collaboration
ALTER PUBLICATION supabase_realtime ADD TABLE public.collaborative_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;
