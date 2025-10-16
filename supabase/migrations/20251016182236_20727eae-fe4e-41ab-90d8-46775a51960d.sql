-- Create schema_error_patterns table for self-healing pattern learning
CREATE TABLE IF NOT EXISTS public.schema_error_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  error_signature TEXT NOT NULL,
  correction_template JSONB NOT NULL DEFAULT '{}'::jsonb,
  times_used INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  confidence_score NUMERIC DEFAULT 0.5 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(table_name, error_signature)
);

-- Create index for faster pattern lookups
CREATE INDEX IF NOT EXISTS idx_schema_patterns_table ON public.schema_error_patterns(table_name);
CREATE INDEX IF NOT EXISTS idx_schema_patterns_confidence ON public.schema_error_patterns(confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_schema_patterns_usage ON public.schema_error_patterns(success_count DESC);

-- Enable RLS
ALTER TABLE public.schema_error_patterns ENABLE ROW LEVEL SECURITY;

-- Allow system to manage patterns
CREATE POLICY "System can manage schema patterns"
ON public.schema_error_patterns
FOR ALL
USING (true)
WITH CHECK (true);

-- Admins can view patterns
CREATE POLICY "Admins can view schema patterns"
ON public.schema_error_patterns
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

COMMENT ON TABLE public.schema_error_patterns IS 'Stores learned schema error correction patterns for self-healing';
COMMENT ON COLUMN public.schema_error_patterns.error_signature IS 'Unique signature of error types and columns';
COMMENT ON COLUMN public.schema_error_patterns.correction_template IS 'JSON template for applying corrections';
COMMENT ON COLUMN public.schema_error_patterns.confidence_score IS 'Confidence in this pattern (0-1)';

-- Create helper function to get table columns (for schema validator)
CREATE OR REPLACE FUNCTION public.get_table_columns(p_table_name TEXT)
RETURNS TABLE (
  column_name TEXT,
  data_type TEXT,
  is_nullable TEXT,
  column_default TEXT,
  is_primary_key BOOLEAN
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.column_name::TEXT,
    c.data_type::TEXT,
    c.is_nullable::TEXT,
    c.column_default::TEXT,
    COALESCE(
      (
        SELECT true
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_schema = 'public'
          AND tc.table_name = p_table_name
          AND tc.constraint_type = 'PRIMARY KEY'
          AND kcu.column_name = c.column_name
      ),
      false
    ) as is_primary_key
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = p_table_name
  ORDER BY c.ordinal_position;
END;
$$;