-- Create reasoning_traces table to store deep reasoning outputs
CREATE TABLE IF NOT EXISTS public.reasoning_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_request TEXT NOT NULL,
  reasoning_output JSONB NOT NULL,
  confidence NUMERIC NOT NULL,
  needed_clarification BOOLEAN DEFAULT false,
  complexity TEXT CHECK (complexity IN ('simple', 'moderate', 'complex')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add index for queries
CREATE INDEX IF NOT EXISTS idx_reasoning_traces_created_at ON public.reasoning_traces(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reasoning_traces_confidence ON public.reasoning_traces(confidence DESC);
CREATE INDEX IF NOT EXISTS idx_reasoning_traces_complexity ON public.reasoning_traces(complexity);

-- Enable RLS
ALTER TABLE public.reasoning_traces ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "System can insert reasoning traces"
  ON public.reasoning_traces
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view reasoning traces"
  ON public.reasoning_traces
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
