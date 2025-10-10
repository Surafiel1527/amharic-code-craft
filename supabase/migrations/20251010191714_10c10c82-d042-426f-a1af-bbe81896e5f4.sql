-- Fix generation_analytics table schema issues
-- Remove NOT NULL constraint from model_used and add default values

ALTER TABLE public.generation_analytics 
ALTER COLUMN model_used DROP NOT NULL;

ALTER TABLE public.generation_analytics 
ALTER COLUMN model_used SET DEFAULT 'gemini-2.5-flash';

-- Ensure other commonly missing columns exist with defaults
DO $$
BEGIN
  -- Add user_request if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'generation_analytics' 
    AND column_name = 'user_request'
  ) THEN
    ALTER TABLE public.generation_analytics 
    ADD COLUMN user_request text DEFAULT NULL;
  END IF;

  -- Add success if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'generation_analytics' 
    AND column_name = 'success'
  ) THEN
    ALTER TABLE public.generation_analytics 
    ADD COLUMN success boolean DEFAULT false;
  END IF;

  -- Add metadata if missing  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'generation_analytics' 
    AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.generation_analytics 
    ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;