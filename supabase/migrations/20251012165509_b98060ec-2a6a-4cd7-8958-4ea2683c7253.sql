-- Add conversation_id to thinking_steps table to associate steps with messages
ALTER TABLE thinking_steps
ADD COLUMN conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE;

-- Add message_id to associate steps with specific messages
ALTER TABLE thinking_steps
ADD COLUMN message_id UUID REFERENCES messages(id) ON DELETE CASCADE;

-- Add index for faster lookups
CREATE INDEX idx_thinking_steps_conversation ON thinking_steps(conversation_id);
CREATE INDEX idx_thinking_steps_message ON thinking_steps(message_id);