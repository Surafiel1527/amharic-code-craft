-- Add missing user_id column to detected_errors table
ALTER TABLE public.detected_errors 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;