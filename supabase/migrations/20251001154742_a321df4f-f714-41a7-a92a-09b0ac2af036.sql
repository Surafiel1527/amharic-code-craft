-- Fix infinite recursion in team workspace policies
-- Step 1: Drop existing policies that depend on the functions
DROP POLICY IF EXISTS "Owners can manage team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can view team memberships for their workspaces" ON public.team_members;
DROP POLICY IF EXISTS "Members can view their team workspaces" ON public.team_workspaces;
DROP POLICY IF EXISTS "Owners can manage their workspaces" ON public.team_workspaces;
DROP POLICY IF EXISTS "Owners can view their workspaces" ON public.team_workspaces;

-- Step 2: Drop and recreate the functions with proper RLS bypassing
DROP FUNCTION IF EXISTS public.is_workspace_owner(uuid, uuid);
DROP FUNCTION IF EXISTS public.is_workspace_member(uuid, uuid);

-- Security definer function with PLPGSQL to explicitly bypass RLS
CREATE OR REPLACE FUNCTION public.is_workspace_owner(_workspace_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.team_workspaces
    WHERE id = _workspace_id AND owner_id = _user_id
  ) INTO result;
  
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_member(_workspace_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE workspace_id = _workspace_id AND user_id = _user_id
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Step 3: Recreate the policies using the fixed functions
CREATE POLICY "Owners can manage team members"
ON public.team_members
FOR ALL
USING (public.is_workspace_owner(workspace_id, auth.uid()));

CREATE POLICY "Users can view team memberships for their workspaces"
ON public.team_members
FOR SELECT
USING ((user_id = auth.uid()) OR public.is_workspace_owner(workspace_id, auth.uid()));

CREATE POLICY "Members can view their team workspaces"
ON public.team_workspaces
FOR SELECT
USING (public.is_workspace_member(id, auth.uid()));

CREATE POLICY "Owners can manage their workspaces"
ON public.team_workspaces
FOR ALL
USING (auth.uid() = owner_id);

CREATE POLICY "Owners can view their workspaces"
ON public.team_workspaces
FOR SELECT
USING (auth.uid() = owner_id);