-- Enable realtime for AGI system tables (skip ai_generation_jobs as it's already enabled)
ALTER PUBLICATION supabase_realtime ADD TABLE public.decision_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.auto_corrections;
ALTER PUBLICATION supabase_realtime ADD TABLE public.confidence_scores;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_feedback_patterns;

-- Create a view for real-time AGI metrics
CREATE OR REPLACE VIEW public.agi_live_metrics AS
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