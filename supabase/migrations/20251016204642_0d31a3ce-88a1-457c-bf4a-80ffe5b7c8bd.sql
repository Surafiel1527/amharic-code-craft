-- Delete corrupted learned pattern that causes healing loop failures
DELETE FROM public.schema_error_patterns 
WHERE id = 'ef887494-d72d-4537-922b-076f649c2fef';