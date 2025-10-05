-- Allow users to view profiles of collaborators in their projects
CREATE POLICY "Users can view profiles of project collaborators"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.active_sessions
    WHERE active_sessions.user_id = profiles.id
    AND active_sessions.project_id IN (
      SELECT id FROM public.projects WHERE user_id = auth.uid()
    )
  )
);