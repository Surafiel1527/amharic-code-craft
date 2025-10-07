-- Add metadata column to messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;