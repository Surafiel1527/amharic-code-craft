-- Unified Intelligence Tables

-- Master orchestration tracking
CREATE TABLE IF NOT EXISTS public.mega_mind_orchestrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  request_type TEXT NOT NULL, -- 'code-generation', 'error-fix', 'deployment', 'enhancement'
  original_request TEXT NOT NULL,
  context JSONB DEFAULT '{}',
  
  -- Orchestration phases
  analysis_phase JSONB DEFAULT '{}', -- What needs to be done
  dependency_phase JSONB DEFAULT '{}', -- Dependencies detected/installed
  generation_phase JSONB DEFAULT '{}', -- Code generated
  verification_phase JSONB DEFAULT '{}', -- Quality checks
  
  status TEXT DEFAULT 'pending', -- 'pending', 'analyzing', 'installing-deps', 'generating', 'verifying', 'completed', 'failed'
  
  -- Results
  dependencies_installed JSONB DEFAULT '[]',
  files_generated JSONB DEFAULT '[]',
  errors_fixed JSONB DEFAULT '[]',
  
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Smart dependency intelligence (enhanced)
CREATE TABLE IF NOT EXISTS public.smart_dependency_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orchestration_id UUID REFERENCES public.mega_mind_orchestrations(id),
  
  package_name TEXT NOT NULL,
  version TEXT,
  detected_from TEXT NOT NULL, -- 'code-analysis', 'error-message', 'user-request'
  detection_context JSONB DEFAULT '{}',
  
  -- Installation details
  should_install BOOLEAN DEFAULT true,
  install_location TEXT, -- 'dependencies', 'devDependencies'
  installation_command TEXT,
  
  -- Status tracking
  status TEXT DEFAULT 'detected', -- 'detected', 'analyzing', 'installing', 'installed', 'failed'
  installation_result JSONB,
  
  -- Intelligence
  peer_dependencies JSONB DEFAULT '[]',
  conflicts_with JSONB DEFAULT '[]',
  alternative_packages JSONB DEFAULT '[]',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  installed_at TIMESTAMP WITH TIME ZONE
);

-- Merge deployment_error_patterns into universal_error_patterns (add missing fields)
ALTER TABLE public.universal_error_patterns 
ADD COLUMN IF NOT EXISTS deployment_provider TEXT,
ADD COLUMN IF NOT EXISTS environment TEXT DEFAULT 'development';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_orchestrations_user ON public.mega_mind_orchestrations(user_id);
CREATE INDEX IF NOT EXISTS idx_orchestrations_status ON public.mega_mind_orchestrations(status);
CREATE INDEX IF NOT EXISTS idx_smart_deps_orchestration ON public.smart_dependency_tracking(orchestration_id);
CREATE INDEX IF NOT EXISTS idx_smart_deps_package ON public.smart_dependency_tracking(package_name);

-- Enable RLS
ALTER TABLE public.mega_mind_orchestrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_dependency_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their orchestrations"
  ON public.mega_mind_orchestrations
  FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their dependency tracking"
  ON public.smart_dependency_tracking
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.mega_mind_orchestrations
      WHERE id = smart_dependency_tracking.orchestration_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage dependency tracking"
  ON public.smart_dependency_tracking
  FOR ALL
  USING (true);