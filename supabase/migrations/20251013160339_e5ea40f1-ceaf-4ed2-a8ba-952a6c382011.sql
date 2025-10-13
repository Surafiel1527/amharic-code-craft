-- Allow service role to manage thinking steps (for edge functions)
DROP POLICY IF EXISTS "Allow service role to manage thinking steps" ON public.thinking_steps;

CREATE POLICY "Allow service role to manage thinking steps"
ON public.thinking_steps
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);