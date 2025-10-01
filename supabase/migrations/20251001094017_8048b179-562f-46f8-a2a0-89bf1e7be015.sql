-- Create table for admin page customizations
CREATE TABLE IF NOT EXISTS public.admin_customizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  customization_type TEXT NOT NULL, -- 'style', 'feature', 'content', 'layout'
  prompt TEXT NOT NULL,
  applied_changes JSONB NOT NULL DEFAULT '{}',
  code_changes TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'applied', 'failed'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  applied_at TIMESTAMP WITH TIME ZONE
);

-- Create table for admin chat messages
CREATE TABLE IF NOT EXISTS public.admin_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role TEXT NOT NULL, -- 'user' or 'assistant'
  content TEXT NOT NULL,
  customization_id UUID REFERENCES public.admin_customizations(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_customizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_customizations
CREATE POLICY "Admins can manage their customizations"
ON public.admin_customizations
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = user_id);

-- RLS Policies for admin_chat_messages
CREATE POLICY "Admins can manage their chat messages"
ON public.admin_chat_messages
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_admin_customizations_user_id ON public.admin_customizations(user_id);
CREATE INDEX idx_admin_customizations_status ON public.admin_customizations(status);
CREATE INDEX idx_admin_chat_messages_user_id ON public.admin_chat_messages(user_id);