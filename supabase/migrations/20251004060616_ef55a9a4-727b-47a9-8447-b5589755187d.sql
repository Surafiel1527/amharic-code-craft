-- Add current_code to conversations table for persistent project state
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS current_code text;