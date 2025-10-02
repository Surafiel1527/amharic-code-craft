-- Testing Generator Tables
CREATE TABLE IF NOT EXISTS public.test_suites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  test_framework TEXT NOT NULL DEFAULT 'jest',
  code_to_test TEXT NOT NULL,
  generated_tests TEXT NOT NULL,
  coverage_estimate NUMERIC,
  status TEXT NOT NULL DEFAULT 'generated',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.refactoring_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  component_name TEXT NOT NULL,
  original_code TEXT NOT NULL,
  suggested_code TEXT NOT NULL,
  reasoning TEXT NOT NULL,
  complexity_before INTEGER,
  complexity_after INTEGER,
  confidence_score NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dependency_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  current_dependencies JSONB NOT NULL DEFAULT '[]'::jsonb,
  suggested_additions JSONB NOT NULL DEFAULT '[]'::jsonb,
  suggested_removals JSONB NOT NULL DEFAULT '[]'::jsonb,
  security_issues JSONB NOT NULL DEFAULT '[]'::jsonb,
  version_conflicts JSONB NOT NULL DEFAULT '[]'::jsonb,
  audit_score NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.code_documentation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  original_code TEXT NOT NULL,
  documented_code TEXT NOT NULL,
  readme_content TEXT,
  api_docs JSONB,
  doc_type TEXT NOT NULL DEFAULT 'inline',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.collaboration_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  created_by UUID NOT NULL,
  session_name TEXT NOT NULL,
  active_users JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.test_suites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refactoring_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dependency_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_documentation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for test_suites
CREATE POLICY "Users can manage their test suites"
  ON public.test_suites
  FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all test suites"
  ON public.test_suites
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for refactoring_suggestions
CREATE POLICY "Users can manage their refactoring suggestions"
  ON public.refactoring_suggestions
  FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all refactoring suggestions"
  ON public.refactoring_suggestions
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for dependency_audits
CREATE POLICY "Users can manage their dependency audits"
  ON public.dependency_audits
  FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all dependency audits"
  ON public.dependency_audits
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for code_documentation
CREATE POLICY "Users can manage their documentation"
  ON public.code_documentation
  FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all documentation"
  ON public.code_documentation
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for collaboration_sessions
CREATE POLICY "Users can view sessions for their projects"
  ON public.collaboration_sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = collaboration_sessions.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create sessions for their projects"
  ON public.collaboration_sessions
  FOR INSERT
  WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = collaboration_sessions.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Session creators can update their sessions"
  ON public.collaboration_sessions
  FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Admins can view all collaboration sessions"
  ON public.collaboration_sessions
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Triggers for updated_at
CREATE TRIGGER update_test_suites_updated_at
  BEFORE UPDATE ON public.test_suites
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_test_suites_user_id ON public.test_suites(user_id);
CREATE INDEX idx_test_suites_project_id ON public.test_suites(project_id);
CREATE INDEX idx_refactoring_suggestions_user_id ON public.refactoring_suggestions(user_id);
CREATE INDEX idx_refactoring_suggestions_status ON public.refactoring_suggestions(status);
CREATE INDEX idx_dependency_audits_user_id ON public.dependency_audits(user_id);
CREATE INDEX idx_code_documentation_user_id ON public.code_documentation(user_id);
CREATE INDEX idx_collaboration_sessions_project_id ON public.collaboration_sessions(project_id);
CREATE INDEX idx_collaboration_sessions_active ON public.collaboration_sessions(is_active);