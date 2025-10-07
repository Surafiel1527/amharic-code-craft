-- Enable realtime updates for projects table
-- This allows the workspace to receive live updates when generation completes

ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;