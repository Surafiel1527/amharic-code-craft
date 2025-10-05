-- Create table for package installations tracking
CREATE TABLE IF NOT EXISTS public.package_installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  packages JSONB NOT NULL DEFAULT '[]'::jsonb,
  installation_time_ms INTEGER NOT NULL,
  success BOOLEAN NOT NULL DEFAULT true,
  errors JSONB DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.package_installations ENABLE ROW LEVEL SECURITY;

-- Users can view their own installations
CREATE POLICY "Users can view their own package installations"
  ON public.package_installations
  FOR SELECT
  USING (auth.uid() = user_id);

-- System can insert installations
CREATE POLICY "System can insert package installations"
  ON public.package_installations
  FOR INSERT
  WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_package_installations_user_id ON public.package_installations(user_id);
CREATE INDEX idx_package_installations_created_at ON public.package_installations(created_at DESC);