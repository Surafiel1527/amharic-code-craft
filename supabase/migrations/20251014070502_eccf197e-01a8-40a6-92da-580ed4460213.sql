-- Create table for tracking applied improvements and their rollback data
CREATE TABLE IF NOT EXISTS public.applied_improvements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_id UUID NOT NULL REFERENCES public.admin_approval_queue(id),
  item_type TEXT NOT NULL,
  item_id UUID NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  applied_by UUID NOT NULL,
  
  -- Store previous state for rollback
  previous_state JSONB NOT NULL,
  new_state JSONB NOT NULL,
  
  -- Rollback tracking
  rolled_back BOOLEAN DEFAULT false,
  rolled_back_at TIMESTAMP WITH TIME ZONE,
  rolled_back_by UUID,
  rollback_reason TEXT,
  
  -- Impact tracking
  affected_tables TEXT[],
  affected_functions TEXT[],
  deployment_safe BOOLEAN DEFAULT true,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.applied_improvements ENABLE ROW LEVEL SECURITY;

-- Only admins can manage applied improvements
CREATE POLICY "Admins can manage applied improvements"
ON public.applied_improvements
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create rollback history table
CREATE TABLE IF NOT EXISTS public.rollback_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  improvement_id UUID NOT NULL REFERENCES public.applied_improvements(id),
  rolled_back_by UUID NOT NULL,
  rolled_back_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reason TEXT NOT NULL,
  
  -- State snapshots
  before_rollback JSONB NOT NULL,
  after_rollback JSONB NOT NULL,
  
  -- Verification
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP WITH TIME ZONE,
  verification_result JSONB,
  
  -- Success tracking
  success BOOLEAN NOT NULL,
  error_message TEXT,
  
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.rollback_history ENABLE ROW LEVEL SECURITY;

-- Only admins can view rollback history
CREATE POLICY "Admins can view rollback history"
ON public.rollback_history
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- System can insert rollback records
CREATE POLICY "System can insert rollback records"
ON public.rollback_history
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_applied_improvements_approval_id ON public.applied_improvements(approval_id);
CREATE INDEX IF NOT EXISTS idx_applied_improvements_rolled_back ON public.applied_improvements(rolled_back);
CREATE INDEX IF NOT EXISTS idx_applied_improvements_applied_at ON public.applied_improvements(applied_at DESC);
CREATE INDEX IF NOT EXISTS idx_rollback_history_improvement_id ON public.rollback_history(improvement_id);
CREATE INDEX IF NOT EXISTS idx_rollback_history_rolled_back_at ON public.rollback_history(rolled_back_at DESC);

-- Create function to check if rollback is safe
CREATE OR REPLACE FUNCTION public.check_rollback_safety(
  p_improvement_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_improvement RECORD;
  v_dependent_improvements INTEGER;
  v_result JSONB;
  v_warnings TEXT[] := '{}';
BEGIN
  -- Get improvement details
  SELECT * INTO v_improvement
  FROM public.applied_improvements
  WHERE id = p_improvement_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'safe', false,
      'error', 'Improvement not found'
    );
  END IF;
  
  -- Check if already rolled back
  IF v_improvement.rolled_back THEN
    RETURN jsonb_build_object(
      'safe', false,
      'error', 'Already rolled back'
    );
  END IF;
  
  -- Check for dependent improvements applied after this one
  SELECT COUNT(*) INTO v_dependent_improvements
  FROM public.applied_improvements
  WHERE applied_at > v_improvement.applied_at
    AND rolled_back = false
    AND item_type = v_improvement.item_type;
  
  IF v_dependent_improvements > 0 THEN
    v_warnings := array_append(
      v_warnings, 
      format('%s newer improvements of same type will be affected', v_dependent_improvements)
    );
  END IF;
  
  -- Check deployment impact
  IF NOT v_improvement.deployment_safe THEN
    v_warnings := array_append(
      v_warnings,
      'Rollback may affect production deployments'
    );
  END IF;
  
  v_result := jsonb_build_object(
    'safe', true,
    'warnings', v_warnings,
    'improvement', jsonb_build_object(
      'type', v_improvement.item_type,
      'applied_at', v_improvement.applied_at,
      'affected_tables', v_improvement.affected_tables,
      'affected_functions', v_improvement.affected_functions
    )
  );
  
  RETURN v_result;
END;
$$;

-- Function to perform rollback
CREATE OR REPLACE FUNCTION public.execute_rollback(
  p_improvement_id UUID,
  p_user_id UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_improvement RECORD;
  v_safety_check JSONB;
  v_rollback_id UUID;
  v_error_msg TEXT;
BEGIN
  -- Check safety first
  v_safety_check := public.check_rollback_safety(p_improvement_id);
  
  IF NOT (v_safety_check->>'safe')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', v_safety_check->>'error'
    );
  END IF;
  
  -- Get improvement
  SELECT * INTO v_improvement
  FROM public.applied_improvements
  WHERE id = p_improvement_id;
  
  -- Mark as rolled back
  UPDATE public.applied_improvements
  SET 
    rolled_back = true,
    rolled_back_at = now(),
    rolled_back_by = p_user_id,
    rollback_reason = p_reason
  WHERE id = p_improvement_id;
  
  -- Create rollback history record
  INSERT INTO public.rollback_history (
    improvement_id,
    rolled_back_by,
    reason,
    before_rollback,
    after_rollback,
    success
  ) VALUES (
    p_improvement_id,
    p_user_id,
    p_reason,
    v_improvement.new_state,
    v_improvement.previous_state,
    true
  )
  RETURNING id INTO v_rollback_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'rollback_id', v_rollback_id,
    'safety_check', v_safety_check
  );
  
EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS v_error_msg = MESSAGE_TEXT;
  
  -- Log failure
  INSERT INTO public.rollback_history (
    improvement_id,
    rolled_back_by,
    reason,
    before_rollback,
    after_rollback,
    success,
    error_message
  ) VALUES (
    p_improvement_id,
    p_user_id,
    p_reason,
    v_improvement.new_state,
    v_improvement.previous_state,
    false,
    v_error_msg
  );
  
  RETURN jsonb_build_object(
    'success', false,
    'error', v_error_msg
  );
END;
$$;