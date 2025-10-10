-- Add diagnostic columns to ai_generation_jobs for conversational diagnostics
ALTER TABLE ai_generation_jobs 
ADD COLUMN IF NOT EXISTS diagnostic_run BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS diagnostic_explanation TEXT,
ADD COLUMN IF NOT EXISTS diagnostic_fixes JSONB DEFAULT '[]'::jsonb;