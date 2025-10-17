-- Add missing context column to detected_errors table
ALTER TABLE public.detected_errors 
ADD COLUMN IF NOT EXISTS context JSONB DEFAULT '{}'::jsonb;