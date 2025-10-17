-- Add missing project_id column to detected_errors table
ALTER TABLE public.detected_errors 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;