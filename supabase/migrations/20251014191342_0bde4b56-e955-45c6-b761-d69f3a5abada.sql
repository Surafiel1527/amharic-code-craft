-- =========================================
-- ENTERPRISE-LEVEL DATABASE SCHEMA FIXES
-- =========================================

-- 1. Add updated_at column to component_dependencies (currently missing)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'component_dependencies' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.component_dependencies 
    ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
    
    -- Create trigger to auto-update
    CREATE TRIGGER update_component_dependencies_updated_at
      BEFORE UPDATE ON public.component_dependencies
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
      
    RAISE NOTICE '✅ Added updated_at column to component_dependencies';
  END IF;
END $$;

-- 2. Add user_id column to messages table (for user-specific message filtering)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.messages 
    ADD COLUMN user_id UUID REFERENCES auth.users(id);
    
    -- Backfill user_id from conversations
    UPDATE public.messages m
    SET user_id = c.user_id
    FROM public.conversations c
    WHERE m.conversation_id = c.id
    AND m.user_id IS NULL;
    
    -- Create index for performance
    CREATE INDEX idx_messages_user_id ON public.messages(user_id);
    
    RAISE NOTICE '✅ Added user_id column to messages';
  END IF;
END $$;

-- 3. Make generation_analytics.status have a default value
-- This prevents NULL constraint violations when status isn't provided
ALTER TABLE public.generation_analytics 
ALTER COLUMN status SET DEFAULT 'success'::generation_status;

-- 4. Add quality_score column to generation_analytics (for tracking code quality)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'generation_analytics' AND column_name = 'quality_score'
  ) THEN
    ALTER TABLE public.generation_analytics 
    ADD COLUMN quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100);
    
    RAISE NOTICE '✅ Added quality_score column to generation_analytics';
  END IF;
END $$;

-- 5. Add validation_warnings column to generation_analytics
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'generation_analytics' AND column_name = 'validation_warnings'
  ) THEN
    ALTER TABLE public.generation_analytics 
    ADD COLUMN validation_warnings JSONB DEFAULT '[]'::jsonb;
    
    RAISE NOTICE '✅ Added validation_warnings column to generation_analytics';
  END IF;
END $$;

-- 6. Add validation_errors column to generation_analytics
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'generation_analytics' AND column_name = 'validation_errors'
  ) THEN
    ALTER TABLE public.generation_analytics 
    ADD COLUMN validation_errors JSONB DEFAULT '[]'::jsonb;
    
    RAISE NOTICE '✅ Added validation_errors column to generation_analytics';
  END IF;
END $$;

COMMENT ON COLUMN public.generation_analytics.quality_score IS 'Overall quality score (0-100) from validation and QA checks';
COMMENT ON COLUMN public.generation_analytics.validation_warnings IS 'Array of validation warnings detected during code generation';
COMMENT ON COLUMN public.generation_analytics.validation_errors IS 'Array of validation errors detected during code generation';