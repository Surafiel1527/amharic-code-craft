-- Create table to store user's Supabase project connections
CREATE TABLE public.user_supabase_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_name TEXT NOT NULL,
  supabase_url TEXT NOT NULL,
  supabase_anon_key TEXT NOT NULL,
  supabase_service_role_key TEXT, -- Optional, for admin operations
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, project_name)
);

-- Enable RLS
ALTER TABLE public.user_supabase_connections ENABLE ROW LEVEL SECURITY;

-- Users can only see their own connections
CREATE POLICY "Users can view own connections"
ON public.user_supabase_connections
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own connections
CREATE POLICY "Users can create own connections"
ON public.user_supabase_connections
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own connections
CREATE POLICY "Users can update own connections"
ON public.user_supabase_connections
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own connections
CREATE POLICY "Users can delete own connections"
ON public.user_supabase_connections
FOR DELETE
USING (auth.uid() = user_id);

-- Add index for faster queries
CREATE INDEX idx_user_supabase_connections_user_id 
ON public.user_supabase_connections(user_id);

-- Add updated_at trigger
CREATE TRIGGER update_user_supabase_connections_updated_at
BEFORE UPDATE ON public.user_supabase_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();