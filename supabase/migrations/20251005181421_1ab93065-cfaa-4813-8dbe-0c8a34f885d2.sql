-- Create table for complete project packages
CREATE TABLE IF NOT EXISTS public.complete_project_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_name TEXT NOT NULL,
  package_data JSONB NOT NULL,
  dependencies_count INTEGER DEFAULT 0,
  total_dependencies INTEGER DEFAULT 0,
  status TEXT DEFAULT 'ready',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.complete_project_packages ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own packages"
  ON public.complete_project_packages
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own packages"
  ON public.complete_project_packages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX idx_complete_packages_user ON public.complete_project_packages(user_id);
CREATE INDEX idx_complete_packages_created ON public.complete_project_packages(created_at DESC);