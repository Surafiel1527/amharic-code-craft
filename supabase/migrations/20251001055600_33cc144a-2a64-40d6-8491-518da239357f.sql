-- Create premium_templates table
CREATE TABLE IF NOT EXISTS public.premium_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  preview_image TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  category TEXT,
  tags TEXT[],
  code JSONB NOT NULL,
  author_id UUID REFERENCES auth.users(id),
  purchases_count INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create team_workspaces table
CREATE TABLE IF NOT EXISTS public.team_workspaces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  plan TEXT NOT NULL DEFAULT 'free',
  max_members INTEGER DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create team_members table
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.team_workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role TEXT NOT NULL DEFAULT 'member',
  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

-- Create api_keys table
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  key_name TEXT NOT NULL,
  api_key TEXT NOT NULL UNIQUE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  usage_count INTEGER DEFAULT 0,
  rate_limit INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Create template_purchases table
CREATE TABLE IF NOT EXISTS public.template_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.premium_templates(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  stripe_payment_id TEXT,
  amount DECIMAL(10,2) NOT NULL,
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(template_id, user_id)
);

-- Enable RLS
ALTER TABLE public.premium_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_purchases ENABLE ROW LEVEL SECURITY;

-- RLS Policies for premium_templates
CREATE POLICY "Templates are viewable by everyone"
ON public.premium_templates FOR SELECT USING (true);

CREATE POLICY "Authors can manage their templates"
ON public.premium_templates FOR ALL USING (auth.uid() = author_id);

-- RLS Policies for team_workspaces
CREATE POLICY "Users can view workspaces they're members of"
ON public.team_workspaces FOR SELECT
USING (
  auth.uid() = owner_id OR
  EXISTS (
    SELECT 1 FROM public.team_members
    WHERE workspace_id = id AND user_id = auth.uid()
  )
);

CREATE POLICY "Owners can manage their workspaces"
ON public.team_workspaces FOR ALL USING (auth.uid() = owner_id);

-- RLS Policies for team_members
CREATE POLICY "Members can view team membership"
ON public.team_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.team_workspaces
    WHERE id = workspace_id AND (owner_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.workspace_id = workspace_id AND tm.user_id = auth.uid()
    ))
  )
);

CREATE POLICY "Owners can manage team members"
ON public.team_members FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.team_workspaces
    WHERE id = workspace_id AND owner_id = auth.uid()
  )
);

-- RLS Policies for api_keys
CREATE POLICY "Users can view their own API keys"
ON public.api_keys FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own API keys"
ON public.api_keys FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for template_purchases
CREATE POLICY "Users can view their purchases"
ON public.template_purchases FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create purchases"
ON public.template_purchases FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_premium_templates_author ON public.premium_templates(author_id);
CREATE INDEX idx_premium_templates_category ON public.premium_templates(category);
CREATE INDEX idx_team_members_workspace ON public.team_members(workspace_id);
CREATE INDEX idx_team_members_user ON public.team_members(user_id);
CREATE INDEX idx_api_keys_user ON public.api_keys(user_id);
CREATE INDEX idx_api_keys_key ON public.api_keys(api_key);
CREATE INDEX idx_template_purchases_template ON public.template_purchases(template_id);
CREATE INDEX idx_template_purchases_user ON public.template_purchases(user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_premium_templates_updated_at
BEFORE UPDATE ON public.premium_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_team_workspaces_updated_at
BEFORE UPDATE ON public.team_workspaces
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();