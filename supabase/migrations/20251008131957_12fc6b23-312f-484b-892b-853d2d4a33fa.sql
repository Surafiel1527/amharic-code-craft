-- Create function to execute database migrations
CREATE OR REPLACE FUNCTION public.execute_migration(migration_sql text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  error_message text;
BEGIN
  -- Execute the SQL
  BEGIN
    EXECUTE migration_sql;
    result := jsonb_build_object(
      'success', true,
      'message', 'Migration executed successfully'
    );
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;
    result := jsonb_build_object(
      'success', false,
      'error', error_message
    );
  END;
  
  RETURN result;
END;
$$;