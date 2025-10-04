-- Enhanced Context & Memory System Tables

-- User coding preferences and style tracking
CREATE TABLE IF NOT EXISTS public.user_coding_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  naming_convention text DEFAULT 'camelCase',
  code_style jsonb DEFAULT '{
    "indentation": "2-spaces",
    "semicolons": true,
    "quotes": "single",
    "trailingCommas": true
  }'::jsonb,
  preferred_patterns jsonb DEFAULT '{}'::jsonb,
  avoid_patterns jsonb DEFAULT '[]'::jsonb,
  framework_preferences jsonb DEFAULT '{}'::jsonb,
  comment_style text DEFAULT 'inline',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_coding_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their coding preferences"
ON public.user_coding_preferences
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their coding preferences"
ON public.user_coding_preferences
FOR ALL
USING (auth.uid() = user_id);

-- Multi-project learning system
CREATE TABLE IF NOT EXISTS public.cross_project_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pattern_type text NOT NULL,
  pattern_name text NOT NULL,
  pattern_code text NOT NULL,
  usage_count integer DEFAULT 1,
  success_rate numeric DEFAULT 100,
  contexts jsonb DEFAULT '[]'::jsonb,
  first_seen_at timestamp with time zone NOT NULL DEFAULT now(),
  last_used_at timestamp with time zone NOT NULL DEFAULT now(),
  confidence_score numeric DEFAULT 50
);

ALTER TABLE public.cross_project_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their cross-project patterns"
ON public.cross_project_patterns
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can manage cross-project patterns"
ON public.cross_project_patterns
FOR ALL
USING (true);

CREATE INDEX IF NOT EXISTS idx_cross_project_patterns_user 
ON public.cross_project_patterns(user_id);

CREATE INDEX IF NOT EXISTS idx_cross_project_patterns_type 
ON public.cross_project_patterns(pattern_type, user_id);

-- Component dependency mapping
CREATE TABLE IF NOT EXISTS public.component_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  component_name text NOT NULL,
  component_type text NOT NULL,
  depends_on jsonb DEFAULT '[]'::jsonb,
  used_by jsonb DEFAULT '[]'::jsonb,
  complexity_score integer DEFAULT 0,
  criticality text DEFAULT 'medium',
  last_modified_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.component_dependencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their component dependencies"
ON public.component_dependencies
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = component_dependencies.conversation_id
    AND conversations.user_id = auth.uid()
  )
);

CREATE POLICY "System can manage component dependencies"
ON public.component_dependencies
FOR ALL
USING (true);

CREATE INDEX IF NOT EXISTS idx_component_dependencies_conversation 
ON public.component_dependencies(conversation_id);

-- Iterative refinement tracking
CREATE TABLE IF NOT EXISTS public.generation_iterations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_generation_id uuid REFERENCES public.generation_analytics(id),
  iteration_number integer NOT NULL,
  refinement_type text NOT NULL,
  analysis_results jsonb NOT NULL,
  improvements_made jsonb NOT NULL,
  quality_score_before numeric,
  quality_score_after numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.generation_iterations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their generation iterations"
ON public.generation_iterations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM generation_analytics
    WHERE generation_analytics.id = generation_iterations.parent_generation_id
    AND generation_analytics.user_id = auth.uid()
  )
);

CREATE POLICY "System can insert generation iterations"
ON public.generation_iterations
FOR INSERT
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_generation_iterations_parent 
ON public.generation_iterations(parent_generation_id);

COMMENT ON TABLE public.user_coding_preferences IS 'Stores user coding style preferences for consistent generation';
COMMENT ON TABLE public.cross_project_patterns IS 'Learns patterns across all user projects for intelligent reuse';
COMMENT ON TABLE public.component_dependencies IS 'Maps component relationships and dependencies';
COMMENT ON TABLE public.generation_iterations IS 'Tracks iterative refinement cycles for quality improvement';