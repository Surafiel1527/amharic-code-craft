-- Add user_id column to existing thinking_steps table
ALTER TABLE public.thinking_steps 
ADD COLUMN IF NOT EXISTS user_id UUID;

-- Update existing rows to set user_id from conversations table
UPDATE public.thinking_steps ts
SET user_id = c.user_id
FROM public.conversations c
WHERE ts.conversation_id = c.id
AND ts.user_id IS NULL;

-- Make user_id NOT NULL after populating
ALTER TABLE public.thinking_steps 
ALTER COLUMN user_id SET NOT NULL;

-- Make conversation_id NOT NULL
ALTER TABLE public.thinking_steps 
ALTER COLUMN conversation_id SET NOT NULL;

-- Enable RLS if not already enabled
ALTER TABLE public.thinking_steps ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own thinking steps" ON public.thinking_steps;
DROP POLICY IF EXISTS "System can insert thinking steps" ON public.thinking_steps;
DROP POLICY IF EXISTS "Users can delete their own thinking steps" ON public.thinking_steps;

-- Policy: Users can view their own thinking steps
CREATE POLICY "Users can view their own thinking steps"
ON public.thinking_steps
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: System can insert thinking steps (service role bypass)
CREATE POLICY "System can insert thinking steps"
ON public.thinking_steps
FOR INSERT
TO service_role
WITH CHECK (true);

-- Policy: Users can delete their own thinking steps
CREATE POLICY "Users can delete their own thinking steps"
ON public.thinking_steps
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);