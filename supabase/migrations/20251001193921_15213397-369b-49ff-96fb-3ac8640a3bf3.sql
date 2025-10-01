-- Drop the existing foreign key constraint
ALTER TABLE admin_chat_messages 
DROP CONSTRAINT IF EXISTS admin_chat_messages_customization_id_fkey;

-- Re-add the foreign key constraint with CASCADE delete
ALTER TABLE admin_chat_messages 
ADD CONSTRAINT admin_chat_messages_customization_id_fkey 
FOREIGN KEY (customization_id) 
REFERENCES admin_customizations(id) 
ON DELETE CASCADE;