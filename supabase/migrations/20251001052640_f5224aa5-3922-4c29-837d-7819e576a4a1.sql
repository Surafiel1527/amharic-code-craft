-- Add version history table
CREATE TABLE public.project_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  version_number INTEGER NOT NULL,
  html_code TEXT NOT NULL,
  changes_summary TEXT,
  quality_score INTEGER,
  performance_score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, version_number)
);

-- Enable RLS on project_versions
ALTER TABLE public.project_versions ENABLE ROW LEVEL SECURITY;

-- RLS policies for project_versions
CREATE POLICY "Users can view versions of their projects"
ON public.project_versions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = project_versions.project_id
    AND (projects.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
);

CREATE POLICY "Users can insert versions for their projects"
ON public.project_versions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = project_versions.project_id
    AND projects.user_id = auth.uid()
  )
);

-- Add code analysis table
CREATE TABLE public.code_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  analysis_type TEXT NOT NULL,
  score INTEGER,
  issues JSONB DEFAULT '[]',
  suggestions JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on code_analysis
ALTER TABLE public.code_analysis ENABLE ROW LEVEL SECURITY;

-- RLS policies for code_analysis
CREATE POLICY "Users can view analysis of their projects"
ON public.code_analysis FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = code_analysis.project_id
    AND (projects.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
);

CREATE POLICY "Users can insert analysis for their projects"
ON public.code_analysis FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = code_analysis.project_id
    AND projects.user_id = auth.uid()
  )
);

-- Add AI assistant conversations table
CREATE TABLE public.assistant_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'አዲስ ውይይት',
  context JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on assistant_conversations
ALTER TABLE public.assistant_conversations ENABLE ROW LEVEL SECURITY;

-- RLS policies for assistant_conversations
CREATE POLICY "Users can manage their assistant conversations"
ON public.assistant_conversations FOR ALL
USING (auth.uid() = user_id);

-- Add assistant messages table
CREATE TABLE public.assistant_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.assistant_conversations(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on assistant_messages
ALTER TABLE public.assistant_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for assistant_messages
CREATE POLICY "Users can view messages in their conversations"
ON public.assistant_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.assistant_conversations
    WHERE assistant_conversations.id = assistant_messages.conversation_id
    AND assistant_conversations.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert messages in their conversations"
ON public.assistant_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.assistant_conversations
    WHERE assistant_conversations.id = assistant_messages.conversation_id
    AND assistant_conversations.user_id = auth.uid()
  )
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_versions_project_id ON public.project_versions(project_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_code_analysis_project_id ON public.code_analysis(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assistant_conversations_user_id ON public.assistant_conversations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_assistant_messages_conversation_id ON public.assistant_messages(conversation_id, created_at);

-- Trigger for assistant_conversations updated_at
CREATE TRIGGER update_assistant_conversations_updated_at
BEFORE UPDATE ON public.assistant_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to auto-create version on project update
CREATE OR REPLACE FUNCTION public.create_project_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_version INTEGER;
BEGIN
  -- Only create version if html_code changed
  IF NEW.html_code IS DISTINCT FROM OLD.html_code THEN
    -- Get next version number
    SELECT COALESCE(MAX(version_number), 0) + 1
    INTO next_version
    FROM public.project_versions
    WHERE project_id = NEW.id;
    
    -- Insert new version
    INSERT INTO public.project_versions (
      project_id,
      version_number,
      html_code,
      changes_summary
    ) VALUES (
      NEW.id,
      next_version,
      NEW.html_code,
      'የአውቶማቲክ ስሪት'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to auto-create versions
CREATE TRIGGER create_version_on_project_update
AFTER UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.create_project_version();