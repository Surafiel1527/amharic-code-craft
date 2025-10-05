-- Create table for Vercel connections
CREATE TABLE public.vercel_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  team_id TEXT,
  team_name TEXT,
  user_email TEXT,
  connected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.vercel_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vercel_connections
CREATE POLICY "Users can view their own Vercel connections"
  ON public.vercel_connections
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Vercel connections"
  ON public.vercel_connections
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Vercel connections"
  ON public.vercel_connections
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Vercel connections"
  ON public.vercel_connections
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create table for deployments
CREATE TABLE public.deployments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  vercel_deployment_id TEXT NOT NULL,
  vercel_project_id TEXT NOT NULL,
  vercel_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'QUEUED',
  environment TEXT NOT NULL DEFAULT 'production',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ready_at TIMESTAMP WITH TIME ZONE,
  build_duration INTEGER,
  error_message TEXT
);

-- Enable RLS
ALTER TABLE public.deployments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for deployments
CREATE POLICY "Users can view their own deployments"
  ON public.deployments
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own deployments"
  ON public.deployments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own deployments"
  ON public.deployments
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create table for environment variables
CREATE TABLE public.project_environment_variables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  target TEXT[] NOT NULL DEFAULT ARRAY['production', 'preview', 'development'],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, key)
);

-- Enable RLS
ALTER TABLE public.project_environment_variables ENABLE ROW LEVEL SECURITY;

-- RLS Policies for environment variables
CREATE POLICY "Users can view their own project env vars"
  ON public.project_environment_variables
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own project env vars"
  ON public.project_environment_variables
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own project env vars"
  ON public.project_environment_variables
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own project env vars"
  ON public.project_environment_variables
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_project_environment_variables_updated_at
  BEFORE UPDATE ON public.project_environment_variables
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_vercel_connections_user_id ON public.vercel_connections(user_id);
CREATE INDEX idx_deployments_user_id ON public.deployments(user_id);
CREATE INDEX idx_deployments_project_id ON public.deployments(project_id);
CREATE INDEX idx_deployments_status ON public.deployments(status);
CREATE INDEX idx_project_environment_variables_project_id ON public.project_environment_variables(project_id);