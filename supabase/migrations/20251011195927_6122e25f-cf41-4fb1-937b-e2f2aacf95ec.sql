-- Fix security definer view by recreating without security definer
-- and ensuring proper RLS policies are in place
DROP VIEW IF EXISTS public.agi_live_metrics;

CREATE OR REPLACE VIEW public.agi_live_metrics
WITH (security_invoker = true)
AS
SELECT 
  COUNT(DISTINCT dl.id) as total_decisions,
  AVG(dl.confidence_score) as avg_confidence,
  COUNT(DISTINCT ac.id) as total_corrections,
  COUNT(DISTINCT CASE WHEN ac.was_successful THEN ac.id END) as successful_corrections,
  COUNT(DISTINCT cs.id) as learning_patterns,
  AVG(cs.current_confidence) as learning_confidence
FROM public.decision_logs dl
LEFT JOIN public.auto_corrections ac ON ac.original_decision_id = dl.id
LEFT JOIN public.confidence_scores cs ON cs.classification_type = dl.classified_as
WHERE dl.created_at > now() - interval '24 hours';

-- Grant access to the view
GRANT SELECT ON public.agi_live_metrics TO authenticated;