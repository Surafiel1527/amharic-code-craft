-- Fix RLS policies for thinking_steps to allow system operations
-- First drop ALL existing policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can view their thinking steps" ON public.thinking_steps;
  DROP POLICY IF EXISTS "Users can view their own thinking steps" ON public.thinking_steps;
  DROP POLICY IF EXISTS "System can insert thinking steps" ON public.thinking_steps;
  DROP POLICY IF EXISTS "Allow service role to manage thinking steps" ON public.thinking_steps;
  DROP POLICY IF EXISTS "Users can delete their own thinking steps" ON public.thinking_steps;
  DROP POLICY IF EXISTS "Users can manage their own thinking steps" ON public.thinking_steps;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create new simplified policies
CREATE POLICY "Users can view their thinking steps"
ON public.thinking_steps
FOR SELECT
USING (
  auth.uid() = user_id 
  OR user_id IS NULL
  OR auth.role() = 'service_role'
);

CREATE POLICY "Service role full access"
ON public.thinking_steps
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Users can manage own thinking steps"
ON public.thinking_steps
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);