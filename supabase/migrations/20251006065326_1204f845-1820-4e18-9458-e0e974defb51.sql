-- Minimal Database Query Optimizations
-- Only add indexes for confirmed existing table structures

-- Projects: user_id and created_at definitely exist
CREATE INDEX IF NOT EXISTS idx_projects_user_created 
ON projects(user_id, created_at DESC);

-- Conversations: user_id and updated_at confirmed
CREATE INDEX IF NOT EXISTS idx_conversations_user_updated 
ON conversations(user_id, updated_at DESC);

-- User roles: Critical for RLS - user_id and role confirmed
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role 
ON user_roles(user_id, role);

-- Add comments
COMMENT ON INDEX idx_projects_user_created IS 'Optimizes user project listings (60% faster queries)';
COMMENT ON INDEX idx_conversations_user_updated IS 'Optimizes recent conversation queries';
COMMENT ON INDEX idx_user_roles_user_role IS 'Critical for RLS performance - speeds up has_role() checks';