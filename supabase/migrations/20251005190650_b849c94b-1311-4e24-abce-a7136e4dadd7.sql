-- Priority 3: Terminal Access Tables (with existence checks)

-- Terminal command history and execution logs
CREATE TABLE IF NOT EXISTS public.terminal_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  command TEXT NOT NULL,
  output TEXT NOT NULL,
  exit_code INTEGER DEFAULT 0,
  working_directory TEXT DEFAULT '/tmp',
  execution_time_ms INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Terminal sessions for persistent environments
CREATE TABLE IF NOT EXISTS public.terminal_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_name TEXT NOT NULL,
  environment_vars JSONB DEFAULT '{}'::jsonb,
  working_directory TEXT DEFAULT '/tmp',
  is_active BOOLEAN DEFAULT true,
  last_command_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Package installation tracking (already exists, skip)

-- Enable RLS
DO $$ 
BEGIN
  ALTER TABLE public.terminal_history ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ 
BEGIN
  ALTER TABLE public.terminal_sessions ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- RLS Policies for terminal_history
DO $$ 
BEGIN
  CREATE POLICY "Users can view their terminal history"
    ON public.terminal_history
    FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  CREATE POLICY "System can insert terminal history"
    ON public.terminal_history
    FOR INSERT
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  CREATE POLICY "Users can delete their terminal history"
    ON public.terminal_history
    FOR DELETE
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RLS Policies for terminal_sessions
DO $$ 
BEGIN
  CREATE POLICY "Users can manage their terminal sessions"
    ON public.terminal_sessions
    FOR ALL
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_terminal_history_user_id ON public.terminal_history(user_id);
CREATE INDEX IF NOT EXISTS idx_terminal_history_created_at ON public.terminal_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_terminal_sessions_user_id ON public.terminal_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_terminal_sessions_active ON public.terminal_sessions(is_active);