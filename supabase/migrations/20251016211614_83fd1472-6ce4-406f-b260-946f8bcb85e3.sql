-- Phase 3: Enterprise Architecture Support Tables

-- Transaction logs table for audit trail
CREATE TABLE IF NOT EXISTS public.transaction_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL,
  operations JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL CHECK (status IN ('committed', 'rolled_back', 'failed')),
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  error_message TEXT,
  restored_tables TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transaction_logs_transaction_id ON public.transaction_logs(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_logs_status ON public.transaction_logs(status);
CREATE INDEX IF NOT EXISTS idx_transaction_logs_created_at ON public.transaction_logs(created_at DESC);

-- Schema versions table for change tracking
CREATE TABLE IF NOT EXISTS public.schema_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL UNIQUE,
  schema_hash TEXT NOT NULL,
  schema_snapshot JSONB NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_schema_versions_version ON public.schema_versions(version);
CREATE INDEX IF NOT EXISTS idx_schema_versions_captured_at ON public.schema_versions(captured_at DESC);

-- Schema change logs table
CREATE TABLE IF NOT EXISTS public.schema_change_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_version TEXT,
  to_version TEXT NOT NULL,
  changes JSONB NOT NULL DEFAULT '[]'::jsonb,
  requires_cache_invalidation BOOLEAN NOT NULL DEFAULT false,
  requires_pattern_update BOOLEAN NOT NULL DEFAULT false,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_schema_change_logs_to_version ON public.schema_change_logs(to_version);
CREATE INDEX IF NOT EXISTS idx_schema_change_logs_severity ON public.schema_change_logs(severity);
CREATE INDEX IF NOT EXISTS idx_schema_change_logs_created_at ON public.schema_change_logs(created_at DESC);

-- Circuit breaker state table (for persistence across restarts)
CREATE TABLE IF NOT EXISTS public.circuit_breaker_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL UNIQUE,
  state TEXT NOT NULL CHECK (state IN ('CLOSED', 'OPEN', 'HALF_OPEN')),
  failures INTEGER NOT NULL DEFAULT 0,
  successes INTEGER NOT NULL DEFAULT 0,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  consecutive_successes INTEGER NOT NULL DEFAULT 0,
  last_failure_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  state_changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_circuit_breaker_state_service ON public.circuit_breaker_state(service_name);
CREATE INDEX IF NOT EXISTS idx_circuit_breaker_state_state ON public.circuit_breaker_state(state);

-- Enable RLS
ALTER TABLE public.transaction_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schema_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schema_change_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circuit_breaker_state ENABLE ROW LEVEL SECURITY;

-- RLS Policies: System and admin access only
CREATE POLICY "System can manage transaction logs"
  ON public.transaction_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can view transaction logs"
  ON public.transaction_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can manage schema versions"
  ON public.schema_versions
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can view schema versions"
  ON public.schema_versions
  FOR SELECT
  USING (true);

CREATE POLICY "System can manage schema change logs"
  ON public.schema_change_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can view schema change logs"
  ON public.schema_change_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can manage circuit breaker state"
  ON public.circuit_breaker_state
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can view circuit breaker state"
  ON public.circuit_breaker_state
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Helper function to get table names (for schema versioning)
CREATE OR REPLACE FUNCTION public.get_table_names()
RETURNS TEXT[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT array_agg(table_name::TEXT)
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    AND table_name NOT LIKE 'pg_%'
    AND table_name NOT LIKE 'sql_%';
$$;

COMMENT ON TABLE public.transaction_logs IS 'Audit trail for all database transactions with rollback support';
COMMENT ON TABLE public.schema_versions IS 'Tracks database schema versions for change detection';
COMMENT ON TABLE public.schema_change_logs IS 'Logs all schema changes with impact analysis';
COMMENT ON TABLE public.circuit_breaker_state IS 'Persists circuit breaker state across service restarts';
