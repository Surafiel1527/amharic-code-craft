-- Add custom instructions and file structure to project_memory
ALTER TABLE project_memory 
ADD COLUMN IF NOT EXISTS custom_instructions TEXT,
ADD COLUMN IF NOT EXISTS file_structure TEXT;

-- Add comment
COMMENT ON COLUMN project_memory.custom_instructions IS 'Custom project guidelines and instructions that AI should follow';
COMMENT ON COLUMN project_memory.file_structure IS 'Required file structure and organization that AI should maintain';