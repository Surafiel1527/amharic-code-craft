-- Fix analytics logging: Allow NULL for generated_code column
-- This aligns with the resilientInsert pattern where generated_code may not always be available
ALTER TABLE public.generation_analytics
ALTER COLUMN generated_code DROP NOT NULL;

-- Add comment explaining why this is nullable
COMMENT ON COLUMN public.generation_analytics.generated_code IS 'Generated code content - nullable because monitoring logs may not always have access to full code (e.g., during failures or when using resilientInsert)';
