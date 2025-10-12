-- Add metadata column to messages table to store full message structure
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_metadata ON public.messages USING gin(metadata);

-- Update existing messages to have empty metadata if null
UPDATE public.messages 
SET metadata = '{}'::jsonb 
WHERE metadata IS NULL;