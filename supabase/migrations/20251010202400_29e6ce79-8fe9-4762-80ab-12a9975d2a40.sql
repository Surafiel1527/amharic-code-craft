-- Fix security warnings: Set immutable search paths for functions

-- Update cleanup_old_metrics function
CREATE OR REPLACE FUNCTION public.cleanup_old_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.orchestration_metrics
  WHERE created_at < now() - interval '30 days';
END;
$function$;

-- Update cleanup_expired_sessions function
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.user_sessions
  WHERE expires_at < now();
END;
$function$;

-- Update update_projects_updated_at function
CREATE OR REPLACE FUNCTION public.update_projects_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Update calculate_job_eta function
CREATE OR REPLACE FUNCTION public.calculate_job_eta(p_job_id uuid)
RETURNS timestamp with time zone
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_progress NUMERIC;
  v_elapsed_seconds NUMERIC;
  v_estimated_total_seconds NUMERIC;
  v_created_at TIMESTAMPTZ;
BEGIN
  SELECT progress, created_at INTO v_progress, v_created_at
  FROM public.ai_generation_jobs
  WHERE id = p_job_id;
  
  IF v_progress <= 0 OR v_progress >= 100 THEN
    RETURN NULL;
  END IF;
  
  v_elapsed_seconds := EXTRACT(EPOCH FROM (now() - v_created_at));
  v_estimated_total_seconds := (v_elapsed_seconds / v_progress) * 100;
  
  RETURN v_created_at + (v_estimated_total_seconds || ' seconds')::INTERVAL;
END;
$function$;