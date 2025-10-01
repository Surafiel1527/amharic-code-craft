-- Drop existing problematic policies
DROP POLICY IF EXISTS "Members can view their team workspaces" ON public.team_workspaces;
DROP POLICY IF EXISTS "Owners can manage team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can view team memberships for their workspaces" ON public.team_members;

-- Create security definer functions to avoid recursion
CREATE OR REPLACE FUNCTION public.is_workspace_owner(_workspace_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_workspaces
    WHERE id = _workspace_id AND owner_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_member(_workspace_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE workspace_id = _workspace_id AND user_id = _user_id
  )
$$;

-- Recreate policies using security definer functions
CREATE POLICY "Members can view their team workspaces"
ON public.team_workspaces
FOR SELECT
USING (public.is_workspace_member(id, auth.uid()));

CREATE POLICY "Owners can manage team members"
ON public.team_members
FOR ALL
USING (public.is_workspace_owner(workspace_id, auth.uid()));

CREATE POLICY "Users can view team memberships for their workspaces"
ON public.team_members
FOR SELECT
USING (
  user_id = auth.uid() OR 
  public.is_workspace_owner(workspace_id, auth.uid())
);