# Message Persistence API Flow

## Complete Request-Response Cycle

This document details the exact flow of a message from user input to permanent database storage.

## Step-by-Step Flow

### Step 1: User Input (Frontend)

**Location:** `src/components/UniversalChatInterface.tsx`

```typescript
// User types in chat input
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!input.trim()) return;
  
  // Call hook to send message
  await sendMessage(input);
  setInput('');
};
```

### Step 2: Hook Preparation (Frontend)

**Location:** `src/hooks/useUniversalAIChat.ts`

```typescript
const sendMessage = async (message: string) => {
  // 1. Get or create conversation ID
  let activeConvId = conversationId;
  if (!activeConvId && persistMessages) {
    activeConvId = await createConversation();
  }
  
  // 2. Add user message to UI optimistically
  const userMessage: Message = {
    id: crypto.randomUUID(),
    role: 'user',
    content: message,
    timestamp: new Date().toISOString()
  };
  setMessages(prev => [...prev, userMessage]);
  
  // 3. Route to backend
  await routeToOrchestrator(
    message,
    activeConvId,
    projectId
  );
};
```

### Step 3: Edge Function Entry (Backend)

**Location:** `supabase/functions/mega-mind/index.ts`

```typescript
serve(async (req) => {
  // 1. Parse request body
  const body = await req.json();
  const { request, userId, conversationId, projectId } = body;
  
  // 2. Create Supabase client (service role)
  const supabase = createClient(
    supabaseUrl, 
    supabaseServiceRoleKey
  );
  
  // 3. Initialize orchestrator
  const megaMind = new MegaMindOrchestrator(
    supabase, 
    lovableApiKey
  );
  
  // 4. Broadcast initial status
  await broadcastStatus(
    supabase,
    projectId || conversationId,
    "Analyzing your request... 🤔",
    'analyzing'
  );
  
  // Continue to processing...
});
```

### Step 4: Save User Message (Backend)

**Location:** `supabase/functions/mega-mind/index.ts`

```typescript
// Save user message BEFORE processing
const { error: userMsgError } = await supabase
  .from('messages')
  .insert({
    conversation_id: conversationId,
    role: 'user',
    content: userRequest,
    user_id: userId,
    metadata: {
      projectId,
      timestamp: new Date().toISOString()
    }
  });

if (userMsgError) {
  console.error('❌ Failed to save user message:', userMsgError);
} else {
  console.log('✅ User message saved to database');
}
```

**Database Result:**
```sql
-- New row in messages table
SELECT * FROM messages WHERE conversation_id = 'xxx';

| id   | conversation_id | role | content          | created_at          |
|------|-----------------|------|------------------|---------------------|
| uuid | conv-uuid       | user | "Create button"  | 2024-01-15 10:30:00 |
```

### Step 5: Process Request (Backend)

**Location:** `supabase/functions/mega-mind/index.ts` → `megaMindOrchestrator.ts`

```typescript
// Process with AI
const { analysis, result } = await megaMind.processRequest({
  userRequest,
  userId,
  conversationId,
  projectId
});

// Result contains:
// - analysis: AI's understanding of request
// - result.success: true/false
// - result.message: Natural AI response
// - result.output: Generated code/files
// - result.filesGenerated: Array of files
// - result.duration: Processing time
// - result.error: Error object if failed
```

### Step 6: Save AI Response (Backend)

**Location:** `supabase/functions/mega-mind/index.ts`

```typescript
// Save AI response to database
const aiMessage = result.message || 
  (result.success 
    ? "All done! Your request has been processed. ✅" 
    : "Something went wrong");

const { error: aiMsgError } = await supabase
  .from('messages')
  .insert({
    conversation_id: conversationId,
    role: 'assistant',
    content: aiMessage,
    user_id: userId,
    metadata: {
      success: result.success,
      filesGenerated: result.filesGenerated?.length || 0,
      duration: result.duration,
      intent: analysis.userIntent.primaryGoal,
      complexity: analysis.complexity.level,
      strategy: analysis.executionStrategy.primaryApproach,
      error: result.error ? {
        message: typeof result.error === 'string' 
          ? result.error 
          : result.error.message,
        type: 'generation_error'
      } : undefined,
      timestamp: new Date().toISOString()
    },
    generated_code: result.output 
      ? JSON.stringify(result.output) 
      : null
  });

if (aiMsgError) {
  console.error('❌ Failed to save AI message:', aiMsgError);
} else {
  console.log('✅ AI response saved to database');
}
```

**Database Result:**
```sql
-- New row added
SELECT * FROM messages WHERE conversation_id = 'xxx';

| id   | conversation_id | role      | content                    | metadata                |
|------|-----------------|-----------|----------------------------|-------------------------|
| uuid | conv-uuid       | user      | "Create button"            | {...}                   |
| uuid | conv-uuid       | assistant | "I've created a button..." | {success: true, files:3}|
```

### Step 7: Broadcast Completion (Backend)

**Location:** `supabase/functions/mega-mind/index.ts`

```typescript
// Broadcast final status (temporary, for real-time UX)
await broadcastStatus(
  supabase,
  channelId,
  result.message,
  result.success ? 'idle' : 'error',
  {
    filesGenerated: result.filesGenerated?.length || 0,
    duration: result.duration,
    errors: result.error ? [result.error.message] : undefined
  }
);

// Add delay to ensure broadcast delivery
await new Promise(resolve => setTimeout(resolve, 500));
```

### Step 8: Return Response (Backend)

**Location:** `supabase/functions/mega-mind/index.ts`

```typescript
return new Response(
  JSON.stringify({
    success: result.success,
    analysis: {
      intent: analysis.userIntent.primaryGoal,
      complexity: analysis.complexity.level,
      strategy: analysis.executionStrategy.primaryApproach,
      confidence: analysis.confidence
    },
    result: {
      message: result.message,
      output: result.output,
      filesGenerated: result.filesGenerated,
      duration: result.duration
    },
    error: result.error?.message
  }),
  { 
    headers: { 
      ...corsHeaders, 
      'Content-Type': 'application/json' 
    } 
  }
);
```

### Step 9: Load Messages (Frontend)

**Location:** `src/hooks/useUniversalAIChat.ts`

```typescript
// On component mount or conversation change
useEffect(() => {
  if (conversationId) {
    loadConversation(conversationId);
  }
}, [conversationId]);

const loadConversation = async (convId: string) => {
  // Load all messages from database
  const { data: messagesData, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", convId)
    .order("created_at", { ascending: true });
  
  if (error) {
    console.error('Failed to load conversation:', error);
    return;
  }
  
  // Transform database messages to Message type
  const typedMessages = messagesData.map(m => ({
    id: m.id,
    role: m.role,
    content: m.content,
    timestamp: m.created_at,
    metadata: m.metadata,
    codeBlock: m.generated_code ? {
      language: 'typescript',
      code: m.generated_code
    } : undefined
  }));
  
  // Display in UI
  setMessages(typedMessages);
};
```

### Step 10: Display Messages (Frontend)

**Location:** `src/components/UniversalChatInterface.tsx`

```typescript
// Render messages from state (loaded from DB)
<ScrollArea className="flex-1">
  {messages.map((message) => (
    <div key={message.id} className={
      message.role === 'user' 
        ? 'user-message' 
        : 'assistant-message'
    }>
      <ReactMarkdown>{message.content}</ReactMarkdown>
      
      {message.metadata?.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {message.metadata.error.message}
          </AlertDescription>
        </Alert>
      )}
    </div>
  ))}
</ScrollArea>
```

## Complete Sequence Diagram

```
┌─────────┐       ┌──────────┐       ┌──────────────┐       ┌──────────┐
│  User   │       │ Frontend │       │ Edge Function│       │ Database │
└────┬────┘       └────┬─────┘       └──────┬───────┘       └────┬─────┘
     │                 │                     │                    │
     │ 1. Type message │                     │                    │
     │────────────────>│                     │                    │
     │                 │                     │                    │
     │                 │ 2. Add to UI        │                    │
     │                 │    optimistically   │                    │
     │                 │                     │                    │
     │                 │ 3. POST /mega-mind  │                    │
     │                 │────────────────────>│                    │
     │                 │                     │                    │
     │                 │                     │ 4. Save user msg   │
     │                 │                     │───────────────────>│
     │                 │                     │                    │
     │                 │                     │ 5. Process with AI │
     │                 │                     │                    │
     │                 │                     │ 6. Save AI response│
     │                 │                     │───────────────────>│
     │                 │                     │                    │
     │                 │ 7. Broadcast status │                    │
     │                 │<────────────────────│                    │
     │                 │                     │                    │
     │                 │ 8. Return response  │                    │
     │                 │<────────────────────│                    │
     │                 │                     │                    │
     │                 │ 9. Load messages    │                    │
     │                 │────────────────────────────────────────>│
     │                 │                     │                    │
     │                 │ 10. Display messages│                    │
     │ 11. See result  │<────────────────────────────────────────│
     │<────────────────│                     │                    │
     │                 │                     │                    │
```

## Error Flow

### What Happens When Generation Fails?

```typescript
// Backend still saves message
const aiMessage = "I encountered an error processing your request: ...";

await supabase
  .from('messages')
  .insert({
    conversation_id: conversationId,
    role: 'assistant',
    content: aiMessage,
    metadata: {
      success: false, // Marked as failure
      error: {
        message: "Generation timeout",
        type: "generation_error"
      }
    }
  });
```

**Frontend Display:**
```typescript
// Error messages persist and are visible on refresh
{message.metadata?.error && (
  <Alert variant="destructive">
    {message.metadata.error.message}
  </Alert>
)}
```

## Timing

**Typical Flow Duration:**
```
User Input:           ~0ms
Frontend Prep:        ~10ms
Network to Backend:   ~50ms
Save User Message:    ~30ms
AI Processing:        5-30s
Save AI Response:     ~30ms
Broadcast:            ~20ms
Network to Frontend:  ~50ms
Load from DB:         ~40ms
Render UI:            ~10ms
─────────────────────────────
Total:                5-30s + ~240ms overhead
```

## Monitoring

### Backend Logs
```typescript
console.log('💾 Persisting conversation to database...');
console.log('✅ User message saved to database');
console.log('✅ AI response saved to database');
```

### Frontend Logs
```typescript
logger.info('📥 Loading conversation', { conversationId });
logger.info('✅ Loaded messages successfully', { count });
```

### Database Queries
```sql
-- Check recent messages
SELECT 
  id, role, 
  LEFT(content, 50) as preview,
  metadata->>'success' as success,
  created_at
FROM messages
WHERE conversation_id = 'your-conv-id'
ORDER BY created_at DESC
LIMIT 10;
```

## Conclusion

This flow ensures:
1. ✅ **Immediate UI Feedback**: User sees message instantly
2. ✅ **Reliable Storage**: Both messages saved to DB
3. ✅ **Real-Time Updates**: Broadcasts for live progress
4. ✅ **Permanent Persistence**: Messages survive refreshes
5. ✅ **Error Handling**: Failures also saved and displayed
