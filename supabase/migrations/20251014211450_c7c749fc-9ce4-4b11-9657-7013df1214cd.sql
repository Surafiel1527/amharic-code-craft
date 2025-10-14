-- Create routing decisions table for tracking intent classification
CREATE TABLE IF NOT EXISTS public.routing_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  conversation_id UUID,
  project_id UUID,
  request_text TEXT NOT NULL,
  route TEXT NOT NULL CHECK (route IN ('DIRECT_EDIT', 'FEATURE_BUILD', 'META_CHAT', 'REFACTOR')),
  confidence NUMERIC NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  reasoning TEXT,
  estimated_time TEXT,
  estimated_cost TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create routing metrics table for performance tracking
CREATE TABLE IF NOT EXISTS public.routing_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route TEXT NOT NULL CHECK (route IN ('DIRECT_EDIT', 'FEATURE_BUILD', 'META_CHAT', 'REFACTOR')),
  actual_duration_ms INTEGER NOT NULL,
  success BOOLEAN NOT NULL DEFAULT true,
  estimated_time TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.routing_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routing_metrics ENABLE ROW LEVEL SECURITY;

-- Routing decisions: Users can view their own decisions
CREATE POLICY "Users can view their own routing decisions"
  ON public.routing_decisions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Routing decisions: System can insert
CREATE POLICY "System can insert routing decisions"
  ON public.routing_decisions
  FOR INSERT
  WITH CHECK (true);

-- Routing metrics: Admins can view all
CREATE POLICY "Admins can view all routing metrics"
  ON public.routing_metrics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Routing metrics: System can insert
CREATE POLICY "System can insert routing metrics"
  ON public.routing_metrics
  FOR INSERT
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_routing_decisions_user_id ON public.routing_decisions(user_id);
CREATE INDEX IF NOT EXISTS idx_routing_decisions_created_at ON public.routing_decisions(created_at);
CREATE INDEX IF NOT EXISTS idx_routing_metrics_route ON public.routing_metrics(route);
CREATE INDEX IF NOT EXISTS idx_routing_metrics_created_at ON public.routing_metrics(created_at);