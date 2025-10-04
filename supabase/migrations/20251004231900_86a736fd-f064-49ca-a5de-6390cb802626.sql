-- Create table for project files
CREATE TABLE IF NOT EXISTS public.project_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_content TEXT NOT NULL,
  file_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(project_id, file_path)
);

-- Enable RLS
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;

-- Policies for project_files
CREATE POLICY "Users can view files in their projects"
ON public.project_files
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = project_files.project_id
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert files in their projects"
ON public.project_files
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = project_files.project_id
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update files in their projects"
ON public.project_files
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = project_files.project_id
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete files in their projects"
ON public.project_files
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = project_files.project_id
    AND projects.user_id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_project_files_updated_at
BEFORE UPDATE ON public.project_files
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create table for component templates
CREATE TABLE IF NOT EXISTS public.component_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  template_code TEXT NOT NULL,
  preview_image TEXT,
  tags TEXT[] DEFAULT '{}',
  usage_count INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on component_templates
ALTER TABLE public.component_templates ENABLE ROW LEVEL SECURITY;

-- Public templates are viewable by everyone
CREATE POLICY "Anyone can view public templates"
ON public.component_templates
FOR SELECT
USING (is_public = true);

-- Users can manage their own templates
CREATE POLICY "Users can manage their templates"
ON public.component_templates
FOR ALL
USING (auth.uid() = created_by);

-- Create table for real-time collaboration sessions
CREATE TABLE IF NOT EXISTS public.active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cursor_position JSONB DEFAULT '{}',
  current_file TEXT,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Enable RLS
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view sessions in their projects
CREATE POLICY "Users can view sessions in their projects"
ON public.active_sessions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = active_sessions.project_id
    AND projects.user_id = auth.uid()
  )
);

-- Users can manage their own sessions
CREATE POLICY "Users can manage their sessions"
ON public.active_sessions
FOR ALL
USING (auth.uid() = user_id);

-- Enable realtime for active_sessions
ALTER PUBLICATION supabase_realtime ADD TABLE public.active_sessions;