-- Create project_memory table for intelligent context management
CREATE TABLE IF NOT EXISTS public.project_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID UNIQUE NOT NULL,
  architecture TEXT,
  features TEXT[] DEFAULT '{}',
  tech_stack TEXT[] DEFAULT '{}',
  recent_changes JSONB DEFAULT '[]',
  code_structure TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_memory ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their project memory"
  ON public.project_memory
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = project_memory.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

-- Create index for faster lookups
CREATE INDEX idx_project_memory_conversation 
  ON public.project_memory(conversation_id);

-- Add updated_at trigger
CREATE TRIGGER update_project_memory_updated_at
  BEFORE UPDATE ON public.project_memory
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.project_memory IS 'Stores intelligent memory for AI code builder to handle large projects';
COMMENT ON COLUMN public.project_memory.architecture IS 'Project architecture description';
COMMENT ON COLUMN public.project_memory.features IS 'List of implemented features';
COMMENT ON COLUMN public.project_memory.tech_stack IS 'Technologies used in the project';
COMMENT ON COLUMN public.project_memory.recent_changes IS 'Last 5-10 changes made to the project';
COMMENT ON COLUMN public.project_memory.code_structure IS 'Summary of code organization (functions, classes, etc.)';