-- Create function to get routing metrics aggregated
CREATE OR REPLACE FUNCTION public.get_routing_metrics()
RETURNS TABLE (
  route TEXT,
  total_executions BIGINT,
  avg_duration_ms NUMERIC,
  min_duration_ms INTEGER,
  max_duration_ms INTEGER,
  success_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rm.route,
    COUNT(*) as total_executions,
    ROUND(AVG(rm.actual_duration_ms)::NUMERIC, 2) as avg_duration_ms,
    MIN(rm.actual_duration_ms) as min_duration_ms,
    MAX(rm.actual_duration_ms) as max_duration_ms,
    ROUND((COUNT(CASE WHEN rm.success THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100), 2) as success_rate
  FROM public.routing_metrics rm
  GROUP BY rm.route
  ORDER BY total_executions DESC;
END;
$$;