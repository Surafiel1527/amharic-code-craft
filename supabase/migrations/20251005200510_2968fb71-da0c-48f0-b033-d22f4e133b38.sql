-- Create installed_packages table for tracking real npm packages
CREATE TABLE IF NOT EXISTS public.installed_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  package_name TEXT NOT NULL,
  version TEXT NOT NULL,
  installed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  auto_detected BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(user_id, package_name, project_id)
);

-- Create package_install_logs table for audit trail
CREATE TABLE IF NOT EXISTS public.package_install_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  package_name TEXT NOT NULL,
  version TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('install', 'uninstall', 'update')),
  success BOOLEAN DEFAULT true,
  auto_detected BOOLEAN DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_installed_packages_user ON public.installed_packages(user_id);
CREATE INDEX IF NOT EXISTS idx_installed_packages_project ON public.installed_packages(project_id);
CREATE INDEX IF NOT EXISTS idx_package_logs_user ON public.package_install_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_package_logs_created ON public.package_install_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.installed_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_install_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for installed_packages
CREATE POLICY "Users can view their installed packages"
  ON public.installed_packages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can install packages"
  ON public.installed_packages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their packages"
  ON public.installed_packages FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can uninstall their packages"
  ON public.installed_packages FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for package_install_logs
CREATE POLICY "Users can view their package logs"
  ON public.package_install_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert package logs"
  ON public.package_install_logs FOR INSERT
  WITH CHECK (true);

-- Create function to get package statistics
CREATE OR REPLACE FUNCTION public.get_package_stats(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  total_packages BIGINT,
  auto_detected_packages BIGINT,
  manual_packages BIGINT,
  total_installs BIGINT,
  total_uninstalls BIGINT,
  most_installed TEXT[]
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT ip.package_name)::BIGINT AS total_packages,
    COUNT(DISTINCT ip.package_name) FILTER (WHERE ip.auto_detected = true)::BIGINT AS auto_detected_packages,
    COUNT(DISTINCT ip.package_name) FILTER (WHERE ip.auto_detected = false)::BIGINT AS manual_packages,
    COUNT(*) FILTER (WHERE pil.action = 'install')::BIGINT AS total_installs,
    COUNT(*) FILTER (WHERE pil.action = 'uninstall')::BIGINT AS total_uninstalls,
    ARRAY_AGG(DISTINCT pil.package_name ORDER BY COUNT(*) DESC) FILTER (WHERE pil.action = 'install') AS most_installed
  FROM public.installed_packages ip
  LEFT JOIN public.package_install_logs pil ON pil.user_id = ip.user_id
  WHERE ip.user_id = COALESCE(p_user_id, auth.uid());
END;
$$;