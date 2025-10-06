-- Fix RLS policies for ai_generation_jobs to allow edge functions to create and update jobs

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own jobs" ON ai_generation_jobs;
DROP POLICY IF EXISTS "Users can create their own jobs" ON ai_generation_jobs;
DROP POLICY IF EXISTS "Users can update their own jobs" ON ai_generation_jobs;
DROP POLICY IF EXISTS "Service role can manage all jobs" ON ai_generation_jobs;

-- Allow authenticated users to create jobs
CREATE POLICY "Users can create jobs"
ON ai_generation_jobs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to view their own jobs
CREATE POLICY "Users can view own jobs"
ON ai_generation_jobs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow authenticated users to update their own jobs
CREATE POLICY "Users can update own jobs"
ON ai_generation_jobs
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- CRITICAL: Allow service role (edge functions) to manage all jobs
CREATE POLICY "Service role full access"
ON ai_generation_jobs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);