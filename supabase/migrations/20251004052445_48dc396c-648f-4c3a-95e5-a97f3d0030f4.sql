-- Enhance project_memory table for complex app support
ALTER TABLE public.project_memory 
ADD COLUMN IF NOT EXISTS architectural_decisions jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS component_relationships jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS coding_patterns jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS performance_notes text,
ADD COLUMN IF NOT EXISTS security_considerations text,
ADD COLUMN IF NOT EXISTS last_plan jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.project_memory.architectural_decisions IS 'Stores key architectural decisions and their reasoning';
COMMENT ON COLUMN public.project_memory.component_relationships IS 'Maps relationships between components and their dependencies';
COMMENT ON COLUMN public.project_memory.coding_patterns IS 'User preferred coding styles and patterns';
COMMENT ON COLUMN public.project_memory.performance_notes IS 'Performance optimization notes and strategies';
COMMENT ON COLUMN public.project_memory.security_considerations IS 'Security patterns and requirements for the project';
COMMENT ON COLUMN public.project_memory.last_plan IS 'Last architecture plan generated before code generation';

-- Create table for storing architecture plans
CREATE TABLE IF NOT EXISTS public.architecture_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  user_request text NOT NULL,
  plan_type text NOT NULL DEFAULT 'generation',
  architecture_overview text NOT NULL,
  component_breakdown jsonb NOT NULL DEFAULT '[]'::jsonb,
  technology_stack jsonb NOT NULL DEFAULT '[]'::jsonb,
  file_structure jsonb NOT NULL DEFAULT '{}'::jsonb,
  estimated_complexity text,
  potential_challenges jsonb DEFAULT '[]'::jsonb,
  recommended_approach text,
  approved boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  approved_at timestamp with time zone
);

ALTER TABLE public.architecture_plans ENABLE ROW LEVEL SECURITY;

-- Users can view plans for their conversations
CREATE POLICY "Users can view their architecture plans"
ON public.architecture_plans
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = architecture_plans.conversation_id
    AND conversations.user_id = auth.uid()
  )
);

-- System can insert plans
CREATE POLICY "System can insert architecture plans"
ON public.architecture_plans
FOR INSERT
WITH CHECK (true);

-- Users can approve their plans
CREATE POLICY "Users can update their architecture plans"
ON public.architecture_plans
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = architecture_plans.conversation_id
    AND conversations.user_id = auth.uid()
  )
);

CREATE INDEX IF NOT EXISTS idx_architecture_plans_conversation 
ON public.architecture_plans(conversation_id);

CREATE INDEX IF NOT EXISTS idx_architecture_plans_created 
ON public.architecture_plans(created_at DESC);