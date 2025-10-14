-- Drop the old function that references system_alerts
DROP FUNCTION IF EXISTS public.send_alert(text, text, text, text, jsonb);

-- Create circuit breaker alerts table (separate from existing system_alerts)
CREATE TABLE IF NOT EXISTS public.circuit_breaker_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_circuit_breaker_alerts_type ON public.circuit_breaker_alerts(alert_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_circuit_breaker_alerts_severity ON public.circuit_breaker_alerts(severity, acknowledged, created_at DESC);

ALTER TABLE public.circuit_breaker_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view circuit breaker alerts"
  ON public.circuit_breaker_alerts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can acknowledge circuit breaker alerts"
  ON public.circuit_breaker_alerts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "System can manage circuit breaker alerts"
  ON public.circuit_breaker_alerts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Recreate send_alert function with correct table name
CREATE OR REPLACE FUNCTION public.send_alert(
  p_alert_type TEXT,
  p_severity TEXT,
  p_title TEXT,
  p_message TEXT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alert_id UUID;
BEGIN
  INSERT INTO public.circuit_breaker_alerts (
    alert_type,
    severity,
    title,
    message,
    metadata,
    acknowledged
  ) VALUES (
    p_alert_type,
    p_severity,
    p_title,
    p_message,
    p_metadata,
    false
  ) RETURNING id INTO v_alert_id;

  RETURN v_alert_id;
END;
$$;