-- Phase 5C: Simple table creation without constraints first

DROP TABLE IF EXISTS public.terminal_sessions CASCADE;
DROP TABLE IF EXISTS public.code_sync CASCADE;
DROP TABLE IF EXISTS public.auto_snapshot_config CASCADE;

-- Shared terminal sessions table
CREATE TABLE public.terminal_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collaboration_session_id UUID NOT NULL,
  user_id UUID NOT NULL,
  command TEXT NOT NULL,
  output TEXT,
  exit_code INTEGER,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Code synchronization table
CREATE TABLE public.code_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collaboration_session_id UUID NOT NULL,
  user_id UUID NOT NULL,
  file_path TEXT NOT NULL DEFAULT 'main.tsx',
  code_content TEXT NOT NULL,
  cursor_position INTEGER DEFAULT 0,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Auto-snapshot configuration
CREATE TABLE public.auto_snapshot_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  enabled BOOLEAN DEFAULT true,
  interval_minutes INTEGER DEFAULT 15,
  max_snapshots INTEGER DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.terminal_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_snapshot_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "terminal_sessions_select" ON public.terminal_sessions FOR SELECT USING (true);
CREATE POLICY "terminal_sessions_insert" ON public.terminal_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "terminal_sessions_update" ON public.terminal_sessions FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "code_sync_select" ON public.code_sync FOR SELECT USING (true);
CREATE POLICY "code_sync_insert" ON public.code_sync FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "code_sync_update" ON public.code_sync FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "code_sync_delete" ON public.code_sync FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "auto_snapshot_all" ON public.auto_snapshot_config FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_terminal_sessions_collab ON public.terminal_sessions(collaboration_session_id);
CREATE INDEX idx_terminal_sessions_status ON public.terminal_sessions(status);
CREATE INDEX idx_code_sync_collab ON public.code_sync(collaboration_session_id);
CREATE INDEX idx_code_sync_synced ON public.code_sync(synced_at DESC);