-- Create table for language detections
CREATE TABLE IF NOT EXISTS public.language_detections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_request TEXT NOT NULL,
  detected_language TEXT NOT NULL,
  framework TEXT,
  confidence INTEGER NOT NULL,
  recommended_runtime TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for Python projects
CREATE TABLE IF NOT EXISTS public.python_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_name TEXT NOT NULL,
  project_type TEXT NOT NULL,
  user_request TEXT NOT NULL,
  files_count INTEGER NOT NULL DEFAULT 0,
  dependencies_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for Python executions
CREATE TABLE IF NOT EXISTS public.python_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  code_length INTEGER NOT NULL,
  packages_installed INTEGER NOT NULL DEFAULT 0,
  success BOOLEAN NOT NULL DEFAULT false,
  execution_time_ms INTEGER NOT NULL,
  exit_code INTEGER NOT NULL,
  has_error BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.language_detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.python_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.python_executions ENABLE ROW LEVEL SECURITY;

-- Policies for language_detections
CREATE POLICY "Users can view their own language detections"
  ON public.language_detections
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert language detections"
  ON public.language_detections
  FOR INSERT
  WITH CHECK (true);

-- Policies for python_projects
CREATE POLICY "Users can view their own Python projects"
  ON public.python_projects
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert Python projects"
  ON public.python_projects
  FOR INSERT
  WITH CHECK (true);

-- Policies for python_executions
CREATE POLICY "Users can view their own Python executions"
  ON public.python_executions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert Python executions"
  ON public.python_executions
  FOR INSERT
  WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_language_detections_user_id ON public.language_detections(user_id);
CREATE INDEX idx_language_detections_created_at ON public.language_detections(created_at DESC);
CREATE INDEX idx_python_projects_user_id ON public.python_projects(user_id);
CREATE INDEX idx_python_projects_created_at ON public.python_projects(created_at DESC);
CREATE INDEX idx_python_executions_user_id ON public.python_executions(user_id);
CREATE INDEX idx_python_executions_created_at ON public.python_executions(created_at DESC);