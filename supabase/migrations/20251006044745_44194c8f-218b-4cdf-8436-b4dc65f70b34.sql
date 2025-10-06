-- Add helper function for deployment learnings
CREATE OR REPLACE FUNCTION public.upsert_deployment_learning(
  p_pattern_name TEXT,
  p_pattern_type TEXT,
  p_recommendation TEXT,
  p_conditions JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_learning_id UUID;
  v_existing_id UUID;
BEGIN
  -- Check if pattern already exists
  SELECT id INTO v_existing_id
  FROM public.deployment_learnings
  WHERE pattern_name = p_pattern_name;
  
  IF v_existing_id IS NOT NULL THEN
    -- Update existing learning
    UPDATE public.deployment_learnings
    SET 
      learned_from_deployments = learned_from_deployments + 1,
      confidence_score = LEAST(100, confidence_score + 5),
      updated_at = now()
    WHERE id = v_existing_id
    RETURNING id INTO v_learning_id;
  ELSE
    -- Create new learning
    INSERT INTO public.deployment_learnings (
      pattern_name,
      pattern_type,
      recommendation,
      conditions,
      learned_from_deployments,
      confidence_score
    ) VALUES (
      p_pattern_name,
      p_pattern_type,
      p_recommendation,
      p_conditions,
      1,
      60
    ) RETURNING id INTO v_learning_id;
  END IF;
  
  RETURN v_learning_id;
END;
$$;