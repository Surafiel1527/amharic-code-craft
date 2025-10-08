-- Clean up and create unified user Supabase connections table
DROP TABLE IF EXISTS public.user_supabase_connections CASCADE;

CREATE TABLE public.user_supabase_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_name TEXT NOT NULL,
  supabase_url TEXT NOT NULL,
  supabase_anon_key TEXT NOT NULL,
  supabase_service_role_key TEXT NOT NULL, -- Needed for migrations
  is_active BOOLEAN DEFAULT false,
  last_tested_at TIMESTAMPTZ,
  test_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, supabase_url)
);

-- Enable RLS
ALTER TABLE public.user_supabase_connections ENABLE ROW LEVEL SECURITY;

-- Users can manage their own connections
CREATE POLICY "Users manage own Supabase connections"
ON public.user_supabase_connections
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Function to ensure only one active connection per user
CREATE OR REPLACE FUNCTION ensure_single_active_connection()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE public.user_supabase_connections
    SET is_active = false
    WHERE user_id = NEW.user_id AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER ensure_single_active_connection_trigger
BEFORE INSERT OR UPDATE ON public.user_supabase_connections
FOR EACH ROW
WHEN (NEW.is_active = true)
EXECUTE FUNCTION ensure_single_active_connection();

-- Index for faster lookups
CREATE INDEX idx_user_supabase_connections_user_active 
ON public.user_supabase_connections(user_id, is_active) 
WHERE is_active = true;