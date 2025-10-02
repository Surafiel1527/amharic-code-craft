-- Fix infinite recursion in team_workspaces RLS policies
-- The issue is that is_workspace_owner queries team_workspaces table, 
-- causing recursion when used in policies on that table

-- Drop the problematic policies first
DROP POLICY IF EXISTS "Members can view their team workspaces" ON public.team_workspaces;
DROP POLICY IF EXISTS "Owners can view their workspaces" ON public.team_workspaces;
DROP POLICY IF EXISTS "Owners can manage their workspaces" ON public.team_workspaces;

-- Recreate policies WITHOUT using functions that query the same table
-- Policy 1: Owners can view their workspaces (direct check, no function)
CREATE POLICY "Owners can view their workspaces"
  ON public.team_workspaces
  FOR SELECT
  USING (auth.uid() = owner_id);

-- Policy 2: Owners can manage their workspaces (direct check, no function)
CREATE POLICY "Owners can manage their workspaces"
  ON public.team_workspaces
  FOR ALL
  USING (auth.uid() = owner_id);

-- Policy 3: Members can view workspaces they're part of
-- This is safe because is_workspace_member queries team_members, not team_workspaces
CREATE POLICY "Members can view their team workspaces"
  ON public.team_workspaces
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.team_members
      WHERE workspace_id = team_workspaces.id 
        AND user_id = auth.uid()
    )
  );