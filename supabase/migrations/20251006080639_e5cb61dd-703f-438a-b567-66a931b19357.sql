-- Create build_events table for activity logging
CREATE TABLE public.build_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID,
  event_type TEXT NOT NULL, -- 'file_created', 'package_installed', 'function_deployed', 'auth_setup', 'database_ready', 'build_started', 'build_complete'
  title TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'success', -- 'success', 'running', 'failed', 'info'
  motivation_message TEXT, -- Optional motivational message
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.build_events ENABLE ROW LEVEL SECURITY;

-- Users can view their own events
CREATE POLICY "Users can view their build events"
  ON public.build_events
  FOR SELECT
  USING (auth.uid() = user_id);

-- System can insert events
CREATE POLICY "System can insert build events"
  ON public.build_events
  FOR INSERT
  WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.build_events;

-- Create index for faster queries
CREATE INDEX idx_build_events_user_created ON public.build_events(user_id, created_at DESC);
CREATE INDEX idx_build_events_project ON public.build_events(project_id, created_at DESC);