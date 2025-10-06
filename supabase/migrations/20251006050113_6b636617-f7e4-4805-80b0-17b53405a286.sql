-- Phase 3 Enhancement: Full Autonomous Package Management

-- Table for tracking package installations/updates
CREATE TABLE IF NOT EXISTS public.package_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id),
  operation_type TEXT NOT NULL CHECK (operation_type IN ('install', 'update', 'uninstall', 'resolve_conflict')),
  package_name TEXT NOT NULL,
  from_version TEXT,
  to_version TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'rolled_back')),
  triggered_by TEXT NOT NULL DEFAULT 'ai_auto' CHECK (triggered_by IN ('ai_auto', 'security_scan', 'dependency_resolver', 'manual')),
  error_message TEXT,
  changes_made JSONB DEFAULT '{}',
  rollback_data JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table for continuous package monitoring
CREATE TABLE IF NOT EXISTS public.package_monitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id),
  monitor_type TEXT NOT NULL CHECK (monitor_type IN ('security', 'updates', 'conflicts', 'deprecations')),
  check_interval_hours INTEGER DEFAULT 24,
  last_check_at TIMESTAMPTZ DEFAULT now(),
  next_check_at TIMESTAMPTZ DEFAULT (now() + interval '24 hours'),
  is_active BOOLEAN DEFAULT true,
  findings_count INTEGER DEFAULT 0,
  auto_fix_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table for package automation rules
CREATE TABLE IF NOT EXISTS public.package_automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id),
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('auto_install', 'auto_update', 'auto_resolve', 'version_pinning')),
  conditions JSONB NOT NULL DEFAULT '{}',
  actions JSONB NOT NULL DEFAULT '{}',
  priority INTEGER DEFAULT 50,
  is_active BOOLEAN DEFAULT true,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_package_operations_user ON public.package_operations(user_id);
CREATE INDEX IF NOT EXISTS idx_package_operations_status ON public.package_operations(status);
CREATE INDEX IF NOT EXISTS idx_package_operations_project ON public.package_operations(project_id);
CREATE INDEX IF NOT EXISTS idx_package_monitors_user ON public.package_monitors(user_id);
CREATE INDEX IF NOT EXISTS idx_package_monitors_next_check ON public.package_monitors(next_check_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_package_automation_rules_user ON public.package_automation_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_package_automation_rules_active ON public.package_automation_rules(is_active) WHERE is_active = true;

-- RLS Policies
ALTER TABLE public.package_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_monitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their package operations"
  ON public.package_operations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage their package monitors"
  ON public.package_monitors FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage their automation rules"
  ON public.package_automation_rules FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to auto-update monitor schedules
CREATE OR REPLACE FUNCTION update_monitor_schedule()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.last_check_at IS DISTINCT FROM OLD.last_check_at THEN
    NEW.next_check_at = NEW.last_check_at + (NEW.check_interval_hours || ' hours')::INTERVAL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_package_monitors_schedule
  BEFORE UPDATE ON public.package_monitors
  FOR EACH ROW
  EXECUTE FUNCTION update_monitor_schedule();