# Message Persistence - Quick Reference

## For Developers

### Using the Chat Interface

```typescript
import { UniversalChatInterface } from '@/components/UniversalChatInterface';

// ✅ Messages persist automatically
<UniversalChatInterface 
  conversationId={activeConversationId}
  projectId={projectId}
  // persistMessages={true} is now default
/>
```

### Accessing Messages

```typescript
import { useUniversalAIChat } from '@/hooks/useUniversalAIChat';

const { messages, sendMessage } = useUniversalAIChat({
  conversationId,
  projectId,
  // Persistence enabled by default
});

// messages array loaded from database on mount
```

### Manual Database Access

```typescript
import { supabase } from '@/integrations/supabase/client';

// Load conversation
const { data: messages } = await supabase
  .from('messages')
  .select('*')
  .eq('conversation_id', conversationId)
  .order('created_at', { ascending: true });

// Save custom message
await supabase
  .from('messages')
  .insert({
    conversation_id: conversationId,
    role: 'assistant',
    content: 'Custom message',
    metadata: { custom: true }
  });
```

## For Backend Functions

### Saving Messages

```typescript
// In any edge function
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Save user message
await supabase
  .from('messages')
  .insert({
    conversation_id: conversationId,
    role: 'user',
    content: userInput,
    user_id: userId,
    metadata: { source: 'edge-function' }
  });

// Save AI response
await supabase
  .from('messages')
  .insert({
    conversation_id: conversationId,
    role: 'assistant',
    content: aiResponse,
    user_id: userId,
    metadata: {
      success: true,
      model: 'gpt-4',
      tokens: 150
    }
  });
```

## Common Patterns

### Create New Conversation

```typescript
const { data: conversation } = await supabase
  .from('conversations')
  .insert({
    title: 'New Chat',
    user_id: userId,
    project_id: projectId
  })
  .select()
  .single();

// Use conversation.id for messages
```

### Load Last N Messages

```typescript
const { data: recentMessages } = await supabase
  .from('messages')
  .select('*')
  .eq('conversation_id', conversationId)
  .order('created_at', { ascending: false })
  .limit(10);
```

### Search Conversations

```typescript
const { data: results } = await supabase
  .from('messages')
  .select('*, conversations(*)')
  .textSearch('content', 'search query')
  .limit(20);
```

## Metadata Examples

### User Message Metadata
```json
{
  "projectId": "uuid",
  "timestamp": "2024-01-15T10:30:00Z",
  "source": "chat-interface"
}
```

### AI Response Metadata (Success)
```json
{
  "success": true,
  "filesGenerated": 3,
  "duration": 12.5,
  "intent": "create_component",
  "complexity": "moderate",
  "strategy": "progressive",
  "timestamp": "2024-01-15T10:30:12Z"
}
```

### AI Response Metadata (Error)
```json
{
  "success": false,
  "error": {
    "message": "Failed to generate component",
    "type": "generation_error"
  },
  "duration": 5.2,
  "timestamp": "2024-01-15T10:30:05Z"
}
```

## Debugging

### Check If Messages Are Saving

```typescript
// In edge function
console.log('💾 Persisting conversation...');
const { data, error } = await supabase
  .from('messages')
  .insert({ /* ... */ });

if (error) {
  console.error('❌ Save failed:', error);
} else {
  console.log('✅ Message saved:', data.id);
}
```

### Check If Messages Are Loading

```typescript
// In frontend
const { data, error } = await supabase
  .from('messages')
  .select('*')
  .eq('conversation_id', conversationId);

console.log('Messages:', data?.length || 0);
if (error) console.error('Load error:', error);
```

### Verify RLS Policies

```sql
-- Test if user can read messages
SELECT * FROM messages 
WHERE conversation_id = 'your-conv-id';

-- Test if user can write messages
INSERT INTO messages (conversation_id, role, content, user_id)
VALUES ('your-conv-id', 'user', 'test', auth.uid())
RETURNING *;
```

## Performance Tips

### Batch Loading
```typescript
// Load messages with related data in one query
const { data } = await supabase
  .from('messages')
  .select(`
    *,
    conversations (
      title,
      project_id
    )
  `)
  .eq('conversation_id', conversationId);
```

### Pagination
```typescript
// Load older messages on scroll
const { data } = await supabase
  .from('messages')
  .select('*')
  .eq('conversation_id', conversationId)
  .order('created_at', { ascending: false })
  .range(50, 99); // Messages 50-99
```

### Caching
```typescript
// Use React Query for automatic caching
const { data: messages } = useQuery({
  queryKey: ['messages', conversationId],
  queryFn: () => loadMessages(conversationId),
  staleTime: 60000 // 1 minute
});
```

## Security

### RLS Policies Applied
- ✅ Users can only view their own messages
- ✅ Users must be authenticated to insert
- ✅ Service role can bypass (for backend)

### Safe Queries
```typescript
// ✅ Good: Uses RLS
const { data } = await supabase
  .from('messages')
  .select('*')
  .eq('conversation_id', conversationId);

// ❌ Bad: Bypassing security (don't do this in frontend)
// Use service role key only in backend
```

## Error Codes

| Error | Meaning | Solution |
|-------|---------|----------|
| `23505` | Duplicate ID | Use `gen_random_uuid()` |
| `23503` | Foreign key violation | Ensure conversation exists |
| `42501` | RLS policy violation | Check user permissions |
| `PGRST204` | No rows returned | Empty conversation (OK) |

## Quick Troubleshooting

**Messages not persisting?**
1. Check if `conversationId` exists
2. Verify backend saves (check logs)
3. Test database write manually

**Messages not loading?**
1. Check if conversation has messages
2. Verify RLS policies
3. Test database read manually

**Duplicate messages?**
1. Check if backend saves multiple times
2. Verify frontend doesn't duplicate
3. Add unique constraints if needed

## Resources

- [Full Documentation](./ENTERPRISE_MESSAGE_PERSISTENCE.md)
- [API Flow](./API_MESSAGE_FLOW.md)
- [Database Schema](../supabase/migrations/)
