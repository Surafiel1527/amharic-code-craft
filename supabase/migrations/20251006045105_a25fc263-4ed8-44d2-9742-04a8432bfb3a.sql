-- Phase 3: Autonomous Package Management
-- Security, Updates, Conflicts, and AI Suggestions

-- Package security scans
CREATE TABLE IF NOT EXISTS public.package_security_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_name TEXT NOT NULL,
  version TEXT NOT NULL,
  scan_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  vulnerability_count INTEGER DEFAULT 0,
  critical_count INTEGER DEFAULT 0,
  high_count INTEGER DEFAULT 0,
  medium_count INTEGER DEFAULT 0,
  low_count INTEGER DEFAULT 0,
  vulnerabilities JSONB DEFAULT '[]'::jsonb,
  scan_status TEXT DEFAULT 'completed',
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Package updates tracking
CREATE TABLE IF NOT EXISTS public.package_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_name TEXT NOT NULL,
  current_version TEXT NOT NULL,
  latest_version TEXT NOT NULL,
  update_type TEXT NOT NULL, -- major, minor, patch
  breaking_changes BOOLEAN DEFAULT false,
  changelog TEXT,
  auto_update_approved BOOLEAN DEFAULT false,
  installed_at TIMESTAMP WITH TIME ZONE,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Dependency conflicts
CREATE TABLE IF NOT EXISTS public.dependency_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_name TEXT NOT NULL,
  version_requested TEXT NOT NULL,
  conflicting_with TEXT NOT NULL,
  conflict_reason TEXT NOT NULL,
  resolution_suggestion TEXT,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  ai_confidence NUMERIC DEFAULT 0.8,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- AI package suggestions
CREATE TABLE IF NOT EXISTS public.ai_package_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggested_package TEXT NOT NULL,
  reason TEXT NOT NULL,
  use_case TEXT NOT NULL,
  alternatives JSONB DEFAULT '[]'::jsonb,
  popularity_score INTEGER DEFAULT 0,
  security_score INTEGER DEFAULT 0,
  maintenance_score INTEGER DEFAULT 0,
  overall_score INTEGER DEFAULT 0,
  accepted BOOLEAN DEFAULT false,
  user_id UUID REFERENCES auth.users(id),
  project_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Package dependency tree
CREATE TABLE IF NOT EXISTS public.package_dependency_tree (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_name TEXT NOT NULL,
  version TEXT NOT NULL,
  dependencies JSONB DEFAULT '{}'::jsonb,
  dev_dependencies JSONB DEFAULT '{}'::jsonb,
  peer_dependencies JSONB DEFAULT '{}'::jsonb,
  total_size_bytes BIGINT DEFAULT 0,
  user_id UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.package_security_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dependency_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_package_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_dependency_tree ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users manage their security scans"
  ON public.package_security_scans
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage their package updates"
  ON public.package_updates
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage their conflicts"
  ON public.dependency_conflicts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view their AI suggestions"
  ON public.ai_package_suggestions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage their dependency trees"
  ON public.package_dependency_tree
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_security_scans_package ON public.package_security_scans(package_name, version);
CREATE INDEX idx_security_scans_user ON public.package_security_scans(user_id);
CREATE INDEX idx_package_updates_user ON public.package_updates(user_id);
CREATE INDEX idx_conflicts_user ON public.dependency_conflicts(user_id);
CREATE INDEX idx_ai_suggestions_user ON public.ai_package_suggestions(user_id);
CREATE INDEX idx_dependency_tree_package ON public.package_dependency_tree(package_name, version);