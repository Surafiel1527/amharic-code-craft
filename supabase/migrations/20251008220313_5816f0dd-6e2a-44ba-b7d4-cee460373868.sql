-- Create conversation_context_log for intelligent tracking
CREATE TABLE IF NOT EXISTS public.conversation_context_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  request text NOT NULL,
  intent jsonb DEFAULT '{}'::jsonb,
  execution_plan jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conversation_context_log ENABLE ROW LEVEL SECURITY;

-- Users can view their own context
CREATE POLICY "Users view own context log"
  ON public.conversation_context_log FOR SELECT
  USING (auth.uid() = user_id);

-- System can insert context
CREATE POLICY "System inserts context"
  ON public.conversation_context_log FOR INSERT
  WITH CHECK (true);

-- Create generated_code table to track what was built
CREATE TABLE IF NOT EXISTS public.generated_code (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  component_name text NOT NULL,
  file_path text NOT NULL,
  code_content text,
  feature_type text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.generated_code ENABLE ROW LEVEL SECURITY;

-- Users can view their generated code
CREATE POLICY "Users view own generated code"
  ON public.generated_code FOR SELECT
  USING (auth.uid() = user_id);

-- System can insert generated code
CREATE POLICY "System inserts generated code"
  ON public.generated_code FOR INSERT
  WITH CHECK (true);

-- Update project_intelligence_context with generated_features
ALTER TABLE public.project_intelligence_context 
ADD COLUMN IF NOT EXISTS generated_features text[] DEFAULT '{}';

-- Create indexes
CREATE INDEX idx_context_log_conversation ON public.conversation_context_log(conversation_id);
CREATE INDEX idx_context_log_user ON public.conversation_context_log(user_id);
CREATE INDEX idx_generated_code_conversation ON public.generated_code(conversation_id);
CREATE INDEX idx_generated_code_user ON public.generated_code(user_id);