-- Create resource_requests table for AGI to request API keys/credentials from users
CREATE TABLE IF NOT EXISTS public.resource_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  conversation_id UUID NOT NULL,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('api_key', 'database', 'credentials', 'external_service')),
  resource_name TEXT NOT NULL,
  description TEXT NOT NULL,
  required BOOLEAN NOT NULL DEFAULT true,
  example TEXT,
  documentation_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'provided', 'skipped')),
  value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  provided_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.resource_requests ENABLE ROW LEVEL SECURITY;

-- Users can view and update their own resource requests
CREATE POLICY "Users can manage own resource requests"
ON public.resource_requests
FOR ALL
USING (auth.uid() = user_id);

-- System can insert resource requests
CREATE POLICY "System can create resource requests"
ON public.resource_requests
FOR INSERT
WITH CHECK (true);

-- Index for faster lookups
CREATE INDEX idx_resource_requests_user_id ON public.resource_requests(user_id);
CREATE INDEX idx_resource_requests_conversation_id ON public.resource_requests(conversation_id);
CREATE INDEX idx_resource_requests_status ON public.resource_requests(status);

-- Update timestamp trigger
CREATE TRIGGER update_resource_requests_updated_at
BEFORE UPDATE ON public.resource_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();