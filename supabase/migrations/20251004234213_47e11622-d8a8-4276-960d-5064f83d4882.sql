-- Create user preferences table for personalization
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  preference_type TEXT NOT NULL, -- 'language', 'framework', 'style', 'complexity'
  preference_value JSONB NOT NULL DEFAULT '{}',
  confidence_score NUMERIC DEFAULT 50,
  learned_from_interactions INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, preference_type)
);

-- Create conversation learnings table to extract patterns from every chat
CREATE TABLE IF NOT EXISTS public.conversation_learnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  conversation_id UUID,
  learned_pattern TEXT NOT NULL,
  pattern_category TEXT NOT NULL, -- 'coding_style', 'tech_preference', 'communication_style'
  confidence NUMERIC DEFAULT 50,
  context JSONB DEFAULT '{}',
  times_reinforced INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_reinforced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create system improvements table for meta-learning
CREATE TABLE IF NOT EXISTS public.system_improvements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  improvement_type TEXT NOT NULL, -- 'prompt', 'workflow', 'pattern'
  before_state TEXT NOT NULL,
  after_state TEXT NOT NULL,
  reason TEXT NOT NULL,
  success_metric NUMERIC,
  status TEXT DEFAULT 'proposed', -- 'proposed', 'approved', 'active', 'reverted'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_at TIMESTAMPTZ,
  created_by UUID
);

-- Create professional knowledge base
CREATE TABLE IF NOT EXISTS public.professional_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_type TEXT NOT NULL, -- 'best_practice', 'architecture_pattern', 'enterprise_standard'
  domain TEXT NOT NULL, -- 'frontend', 'backend', 'security', 'performance'
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  code_examples JSONB DEFAULT '[]',
  applicability_score NUMERIC DEFAULT 100,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_learnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_improvements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_knowledge ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_preferences
CREATE POLICY "Users can manage their own preferences"
  ON public.user_preferences FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert preferences"
  ON public.user_preferences FOR INSERT
  WITH CHECK (true);

-- RLS Policies for conversation_learnings
CREATE POLICY "Users can view their learnings"
  ON public.conversation_learnings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage learnings"
  ON public.conversation_learnings FOR ALL
  USING (true);

-- RLS Policies for system_improvements
CREATE POLICY "Admins can manage improvements"
  ON public.system_improvements FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert improvements"
  ON public.system_improvements FOR INSERT
  WITH CHECK (true);

-- RLS Policies for professional_knowledge
CREATE POLICY "Anyone can view professional knowledge"
  ON public.professional_knowledge FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage knowledge"
  ON public.professional_knowledge FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add updated_at triggers
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_professional_knowledge_updated_at
  BEFORE UPDATE ON public.professional_knowledge
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert foundational professional knowledge
INSERT INTO public.professional_knowledge (knowledge_type, domain, title, content, code_examples) VALUES
('best_practice', 'frontend', 'Component Architecture', 'Keep components small, focused, and reusable. Follow single responsibility principle. Use composition over inheritance.', '[{"language": "typescript", "example": "// Good: Small, focused component\nconst Button = ({ onClick, children }) => (\n  <button onClick={onClick}>{children}</button>\n);"}]'),
('best_practice', 'backend', 'API Error Handling', 'Always return consistent error responses with proper HTTP status codes. Include error codes for client-side handling. Log errors with context.', '[{"language": "typescript", "example": "// Good error response\nreturn new Response(\n  JSON.stringify({ error: \"Resource not found\", code: \"RESOURCE_NOT_FOUND\" }),\n  { status: 404, headers: corsHeaders }\n);"}]'),
('architecture_pattern', 'frontend', 'State Management', 'Use React hooks for local state. Leverage context for shared state. Consider external state management only for complex apps.', '[{"language": "typescript", "example": "const [state, setState] = useState(initialState);\nconst value = useMemo(() => ({ state, setState }), [state]);"}]'),
('enterprise_standard', 'security', 'Authentication', 'Always use secure authentication. Implement proper RLS policies. Never expose sensitive data. Use JWT tokens with proper expiration.', '[{"language": "sql", "example": "CREATE POLICY \"Users own data\"\n  ON table_name FOR ALL\n  USING (auth.uid() = user_id);"}]'),
('enterprise_standard', 'performance', 'Optimization', 'Lazy load components. Optimize images. Use pagination for large datasets. Implement caching strategies. Monitor performance metrics.', '[{"language": "typescript", "example": "const LazyComponent = lazy(() => import(\"./Component\"));\n\n<Suspense fallback={<Loading />}>\n  <LazyComponent />\n</Suspense>"}]');

-- Create index for faster lookups
CREATE INDEX idx_user_preferences_user_id ON public.user_preferences(user_id);
CREATE INDEX idx_conversation_learnings_user_id ON public.conversation_learnings(user_id);
CREATE INDEX idx_conversation_learnings_category ON public.conversation_learnings(pattern_category);
CREATE INDEX idx_professional_knowledge_domain ON public.professional_knowledge(domain);
CREATE INDEX idx_professional_knowledge_type ON public.professional_knowledge(knowledge_type);