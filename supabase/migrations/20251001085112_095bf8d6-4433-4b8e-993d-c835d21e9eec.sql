-- Create enum for feedback types
CREATE TYPE feedback_type AS ENUM ('thumbs_up', 'thumbs_down', 'modified', 'accepted', 'rejected');

-- Create enum for generation status
CREATE TYPE generation_status AS ENUM ('success', 'partial_success', 'failure', 'error');

-- Table to track all AI generations
CREATE TABLE public.generation_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Generation metadata
  prompt_version TEXT NOT NULL DEFAULT 'v1.0.0',
  model_used TEXT NOT NULL,
  user_prompt TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  generated_code TEXT NOT NULL,
  
  -- Context
  conversation_history JSONB DEFAULT '[]'::jsonb,
  existing_code_context TEXT,
  
  -- Performance metrics
  generation_time_ms INTEGER,
  tokens_used INTEGER,
  cost_estimate NUMERIC(10, 6),
  
  -- Outcome tracking
  status generation_status NOT NULL,
  error_message TEXT,
  
  -- User interaction
  feedback_type feedback_type,
  user_modified BOOLEAN DEFAULT false,
  modifications_made TEXT,
  time_to_accept_seconds INTEGER,
  
  -- Success indicators
  code_worked BOOLEAN,
  user_satisfaction_score INTEGER CHECK (user_satisfaction_score >= 1 AND user_satisfaction_score <= 5),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table for prompt versions
CREATE TABLE public.prompt_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT UNIQUE NOT NULL,
  system_prompt TEXT NOT NULL,
  
  -- Performance tracking
  success_rate NUMERIC(5, 2),
  average_satisfaction NUMERIC(3, 2),
  total_uses INTEGER DEFAULT 0,
  
  -- A/B testing
  is_active BOOLEAN DEFAULT false,
  traffic_percentage INTEGER DEFAULT 0 CHECK (traffic_percentage >= 0 AND traffic_percentage <= 100),
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  notes TEXT,
  parent_version TEXT,
  improvements_made JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table for error patterns
CREATE TABLE public.error_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Pattern identification
  error_type TEXT NOT NULL,
  error_pattern TEXT NOT NULL,
  frequency INTEGER DEFAULT 1,
  
  -- Context
  common_user_prompts JSONB DEFAULT '[]'::jsonb,
  affected_model TEXT,
  
  -- Solution
  solution TEXT,
  fix_applied BOOLEAN DEFAULT false,
  auto_fix_success_rate NUMERIC(5, 2),
  
  -- Learning
  learned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  resolution_status TEXT DEFAULT 'identified' CHECK (resolution_status IN ('identified', 'analyzing', 'solved', 'monitoring'))
);

-- Table for knowledge base
CREATE TABLE public.ai_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Pattern
  pattern_name TEXT NOT NULL,
  category TEXT NOT NULL,
  
  -- Best practices learned
  best_approach TEXT NOT NULL,
  common_mistakes JSONB DEFAULT '[]'::jsonb,
  code_examples JSONB DEFAULT '[]'::jsonb,
  
  -- Learning metrics
  learned_from_cases INTEGER DEFAULT 0,
  success_rate NUMERIC(5, 2),
  confidence_score NUMERIC(3, 2),
  
  -- Metadata
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table for self-improvement history
CREATE TABLE public.ai_improvements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- What was improved
  improvement_type TEXT NOT NULL CHECK (improvement_type IN ('prompt', 'pattern', 'error_fix', 'knowledge')),
  old_version TEXT,
  new_version TEXT,
  
  -- Why it was improved
  reason TEXT NOT NULL,
  analysis JSONB,
  
  -- Results
  before_metrics JSONB,
  after_metrics JSONB,
  success_improvement NUMERIC(5, 2),
  
  -- Approval
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'testing', 'approved', 'rejected', 'rolled_back')),
  approved_by UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  deployed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.generation_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_improvements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for generation_analytics
CREATE POLICY "Users can view their own analytics"
  ON public.generation_analytics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analytics"
  ON public.generation_analytics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analytics"
  ON public.generation_analytics FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all analytics"
  ON public.generation_analytics FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for prompt_versions
CREATE POLICY "Anyone can view active prompts"
  ON public.prompt_versions FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage prompts"
  ON public.prompt_versions FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for error_patterns
CREATE POLICY "Admins can manage error patterns"
  ON public.error_patterns FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view solved patterns"
  ON public.error_patterns FOR SELECT
  USING (resolution_status = 'solved');

-- RLS Policies for knowledge base
CREATE POLICY "Anyone can view knowledge base"
  ON public.ai_knowledge_base FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage knowledge base"
  ON public.ai_knowledge_base FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for improvements
CREATE POLICY "Admins can manage improvements"
  ON public.ai_improvements FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view approved improvements"
  ON public.ai_improvements FOR SELECT
  USING (status = 'approved');

-- Create indexes for performance
CREATE INDEX idx_generation_analytics_user_id ON public.generation_analytics(user_id);
CREATE INDEX idx_generation_analytics_created_at ON public.generation_analytics(created_at DESC);
CREATE INDEX idx_generation_analytics_status ON public.generation_analytics(status);
CREATE INDEX idx_prompt_versions_active ON public.prompt_versions(is_active);
CREATE INDEX idx_error_patterns_frequency ON public.error_patterns(frequency DESC);
CREATE INDEX idx_error_patterns_status ON public.error_patterns(resolution_status);

-- Create trigger for updated_at
CREATE TRIGGER update_generation_analytics_updated_at
  BEFORE UPDATE ON public.generation_analytics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_prompt_versions_updated_at
  BEFORE UPDATE ON public.prompt_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_knowledge_base_updated_at
  BEFORE UPDATE ON public.ai_knowledge_base
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();