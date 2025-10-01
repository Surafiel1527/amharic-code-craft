-- Create customization_snapshots table for named versions
CREATE TABLE public.customization_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  customizations JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customization_snapshots ENABLE ROW LEVEL SECURITY;

-- Admins can manage their snapshots
CREATE POLICY "Admins can manage their snapshots"
ON public.customization_snapshots
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = user_id);

-- Add index for faster queries
CREATE INDEX idx_customization_snapshots_user_id ON public.customization_snapshots(user_id);
CREATE INDEX idx_customization_snapshots_created_at ON public.customization_snapshots(created_at DESC);