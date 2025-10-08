-- Fix security issues: Add search_path to functions without it

-- Fix update_projects_updated_at function
CREATE OR REPLACE FUNCTION public.update_projects_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix update_pattern_confidence function  
CREATE OR REPLACE FUNCTION public.update_pattern_confidence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  total_attempts INTEGER;
  successful_attempts INTEGER;
  new_confidence NUMERIC;
BEGIN
  SELECT 
    success_count + failure_count,
    success_count
  INTO total_attempts, successful_attempts
  FROM public.universal_error_patterns
  WHERE id = NEW.pattern_id;
  
  IF total_attempts > 0 THEN
    new_confidence := (successful_attempts + 2.0) / (total_attempts + 4.0);
  ELSE
    new_confidence := 0.5;
  END IF;
  
  UPDATE public.universal_error_patterns
  SET 
    confidence_score = new_confidence,
    last_used_at = now(),
    last_success_at = CASE WHEN NEW.fix_worked THEN now() ELSE last_success_at END
  WHERE id = NEW.pattern_id;
  
  RETURN NEW;
END;
$function$;

-- Fix calculate_improvement_percentage function
CREATE OR REPLACE FUNCTION public.calculate_improvement_percentage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.improvement_percentage := ((NEW.after_metric - NEW.before_metric) / NEW.before_metric) * 100;
  RETURN NEW;
END;
$function$;

-- Fix update_monitor_schedule function
CREATE OR REPLACE FUNCTION public.update_monitor_schedule()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  IF NEW.last_check_at IS DISTINCT FROM OLD.last_check_at THEN
    NEW.next_check_at = NEW.last_check_at + (NEW.check_interval_hours || ' hours')::INTERVAL;
  END IF;
  RETURN NEW;
END;
$function$;

-- Fix create_project_version function
CREATE OR REPLACE FUNCTION public.create_project_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  next_version INTEGER;
BEGIN
  IF NEW.html_code IS DISTINCT FROM OLD.html_code THEN
    SELECT COALESCE(MAX(version_number), 0) + 1
    INTO next_version
    FROM public.project_versions
    WHERE project_id = NEW.id;
    
    INSERT INTO public.project_versions (
      project_id,
      version_number,
      html_code,
      changes_summary
    ) VALUES (
      NEW.id,
      next_version,
      NEW.html_code,
      'የአውቶማቲክ ስሪት'
    );
  END IF;
  
  RETURN NEW;
END;
$function$;