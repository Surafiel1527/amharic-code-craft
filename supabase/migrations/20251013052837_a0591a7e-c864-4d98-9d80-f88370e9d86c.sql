-- Add is_summary column to messages table (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'messages' AND column_name = 'is_summary') THEN
    ALTER TABLE messages ADD COLUMN is_summary boolean DEFAULT false;
  END IF;
END $$;