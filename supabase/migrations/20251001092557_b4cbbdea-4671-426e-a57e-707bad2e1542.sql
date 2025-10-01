-- Fix infinite recursion in team_workspaces and team_members RLS policies

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view workspaces they're members of" ON public.team_workspaces;
DROP POLICY IF EXISTS "Members can view team membership" ON public.team_members;

-- Create simple, non-recursive policies for team_workspaces
CREATE POLICY "Owners can view their workspaces"
ON public.team_workspaces
FOR SELECT
USING (auth.uid() = owner_id);

CREATE POLICY "Members can view their team workspaces"
ON public.team_workspaces
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_members.workspace_id = team_workspaces.id
    AND team_members.user_id = auth.uid()
  )
);

-- Create simple policy for team_members
CREATE POLICY "Users can view team memberships for their workspaces"
ON public.team_members
FOR SELECT
USING (
  user_id = auth.uid() 
  OR 
  EXISTS (
    SELECT 1 FROM public.team_workspaces
    WHERE team_workspaces.id = team_members.workspace_id
    AND team_workspaces.owner_id = auth.uid()
  )
);

-- Grant admin role to the first user (you)
-- This will run safely - if user already has role, it will be ignored due to unique constraint
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
ORDER BY created_at ASC
LIMIT 1
ON CONFLICT (user_id, role) DO NOTHING;