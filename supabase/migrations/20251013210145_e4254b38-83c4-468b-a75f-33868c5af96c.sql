-- Create UX Quality Signals table for user experience monitoring
CREATE TABLE IF NOT EXISTS public.ux_quality_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  generation_id UUID,
  signal_type TEXT NOT NULL CHECK (signal_type IN (
    'quick_question',
    'quick_edit',
    'immediate_regeneration',
    'fix_request',
    'error_report',
    'download',
    'session_length'
  )),
  signal_value NUMERIC NOT NULL,
  signal_data JSONB DEFAULT '{}',
  quality_correlation NUMERIC,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_ux_signals_user_id ON public.ux_quality_signals(user_id);
CREATE INDEX IF NOT EXISTS idx_ux_signals_generation_id ON public.ux_quality_signals(generation_id);
CREATE INDEX IF NOT EXISTS idx_ux_signals_timestamp ON public.ux_quality_signals(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ux_signals_signal_type ON public.ux_quality_signals(signal_type);

-- Enable RLS
ALTER TABLE public.ux_quality_signals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own UX signals"
  ON public.ux_quality_signals
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert UX signals"
  ON public.ux_quality_signals
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all UX signals"
  ON public.ux_quality_signals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Add quality_healed column to generation_quality_metrics if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'generation_quality_metrics' 
    AND column_name = 'quality_healed'
  ) THEN
    ALTER TABLE public.generation_quality_metrics 
    ADD COLUMN quality_healed BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add healing_pattern_id to track which pattern was used for healing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'generation_quality_metrics' 
    AND column_name = 'healing_pattern_id'
  ) THEN
    ALTER TABLE public.generation_quality_metrics 
    ADD COLUMN healing_pattern_id UUID;
  END IF;
END $$;