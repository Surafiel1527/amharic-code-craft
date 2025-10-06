-- Create test results table to track what works
CREATE TABLE IF NOT EXISTS public.platform_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL,
  test_category TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'passed', 'failed')),
  error_message TEXT,
  execution_time_ms INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.platform_tests ENABLE ROW LEVEL SECURITY;

-- Users can view their own test results
CREATE POLICY "Users can view their own tests"
  ON public.platform_tests
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own test results
CREATE POLICY "Users can create their own tests"
  ON public.platform_tests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own test results
CREATE POLICY "Users can update their own tests"
  ON public.platform_tests
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create a test data table for CRUD operations
CREATE TABLE IF NOT EXISTS public.test_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.test_data ENABLE ROW LEVEL SECURITY;

-- Users can manage their own test data
CREATE POLICY "Users can manage their own test data"
  ON public.test_data
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_platform_tests_user_id ON public.platform_tests(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_tests_status ON public.platform_tests(status);
CREATE INDEX IF NOT EXISTS idx_test_data_user_id ON public.test_data(user_id);

-- Enable realtime for test_data
ALTER PUBLICATION supabase_realtime ADD TABLE public.test_data;