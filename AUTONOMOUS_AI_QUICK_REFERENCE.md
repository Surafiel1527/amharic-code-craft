# Autonomous AI Quick Reference

## 🚀 Quick Start

### How to Use the System

**1. Generate New Project:**
```typescript
const { data } = await supabase.functions.invoke('universal-router', {
  body: {
    request: "Create a coffee shop website",
    userId: user.id,
    projectId: undefined,  // New project
    conversationId: undefined,  // New conversation
    context: {
      framework: "react"  // Optional, AI can detect
    }
  }
});
```

**2. Update Existing Project:**
```typescript
const { data } = await supabase.functions.invoke('universal-router', {
  body: {
    request: "Add a contact form",
    userId: user.id,
    projectId: "existing-proj-123",  // ← AI loads existing files
    conversationId: "existing-conv-456",  // ← AI reads chat history
  }
});
```

---

## 🎯 Key Concepts

### What AI Knows

| Context | Source | What AI Uses It For |
|---------|--------|---------------------|
| **Existing Files** | `projectId` → database | Understands what exists, makes surgical updates |
| **Conversation History** | `conversationId` → database | Knows what user asked before, builds progressively |
| **Framework** | User selection or AI detection | Respects HTML vs React choice |
| **User Intent** | Meta-cognitive analysis | Understands REAL goal, not just keywords |

---

### How Framework Detection Works

```typescript
// Option 1: User explicitly selects
{ framework: "react" }  // ← AI respects this

// Option 2: AI detects from request
"Simple landing page" → HTML
"Todo app with state" → React
"Interactive dashboard" → React

// Option 3: AI loads from existing project
If projectId exists → use existing framework
Never breaks existing architecture
```

---

### How Updates Work

```
User: "Create a website"
→ AI creates: App.tsx, Hero.tsx, Menu.tsx

User: "Add contact form"
→ AI sees existing files
→ AI reads previous conversation
→ AI knows: "User wants to ADD, not rebuild"
→ AI generates: ContactForm.tsx (only new file)
→ Updates file_tree in database
```

---

## 📁 Where Data is Stored

### Projects Table
```sql
{
  id: "proj-123",
  framework: "react",
  file_tree: {
    "src/App.tsx": "...",
    "src/components/Hero.tsx": "...",
    "src/components/Menu.tsx": "..."
  }
}
```

### Conversations Table
```sql
{
  id: "conv-456",
  project_id: "proj-123",
  messages: [
    { role: "user", content: "Create website" },
    { role: "assistant", content: "Created..." },
    { role: "user", content: "Add contact form" }
  ]
}
```

---

## 🧠 AI Decision Flow

```
User Request
    ↓
Universal Router (forwards to mega-mind)
    ↓
Mega Mind Orchestrator
    ↓
1. Load Context (files + conversation)
    ↓
2. Meta-Cognitive Analyzer
   • What does user want?
   • How complex is it?
   • What strategy to use?
   • Which framework?
    ↓
3. Adaptive Executor
   • Instant: Direct execution
   • Progressive: Phase-by-phase
   • Conversational: Just answer
   • Hybrid: Explain + execute
    ↓
4. Natural Communicator
   • Generate AI messages
   • Broadcast realtime updates
    ↓
Files Generated → Save to Database
```

---

## 💬 How Communication Works

**AI generates ALL messages (no templates):**

```typescript
// Status Updates (AI-generated)
"🎯 Initializing in your workspace..."
"🤔 Planning the best structure for your app..."
"⚙️ Creating your React components..."

// Completion Summary (AI-generated)
"🎉 All done! I've created a coffee shop website with:
- Hero section
- Menu with cards
- Contact form
What would you like to add next?"

// Error Messages (AI-generated)
"⚠️ I ran into an issue with the database.
Want me to create the missing table?"
```

---

## 🎨 Frontend Display

```typescript
// Subscribe to realtime updates
import { AIThinkingPanel } from '@/components/AIThinkingPanel';

<AIThinkingPanel 
  projectId={projectId}
  conversationId={conversationId}
  workspaceName="My Coffee Shop"
/>

// Shows:
// ✓ Workspace context
// ✓ AI's thinking stages
// ✓ Current progress
// ✓ Files being generated
```

---

## 🔗 Important Links

- **Full Architecture:** [UNIVERSAL_MEGA_MIND_ARCHITECTURE.md](./UNIVERSAL_MEGA_MIND_ARCHITECTURE.md)
- **Visual Demo:** `/architecture` page in app
- **Workspace Demo:** `/workspace-demo` page in app

---

## ⚡ Pro Tips

1. **Always pass projectId** for updates - AI loads existing context
2. **Always pass conversationId** - AI reads chat history
3. **Let AI detect framework** unless you have strong preference
4. **Be specific in requests** - AI understands natural language
5. **Ask for updates incrementally** - Better results than big rewrites

---

## 🐛 Debugging

**Check realtime updates:**
```typescript
const channel = supabase
  .channel(`ai-status-${projectId}`)
  .on('broadcast', { event: 'status-update' }, ({ payload }) => {
    console.log('AI Status:', payload);
  });
```

**Check database:**
```sql
-- See project files
SELECT file_tree FROM projects WHERE id = 'proj-123';

-- See conversation history
SELECT messages FROM conversations WHERE id = 'conv-456';
```

---

## 📊 System Status

✅ **Meta-Cognitive Analyzer** - Fully operational  
✅ **Natural Communicator** - All messages AI-generated  
✅ **Adaptive Executor** - All modes implemented  
✅ **Context Awareness** - Full file + conversation tracking  
✅ **Framework Detection** - HTML/React autonomous detection  
✅ **Database Persistence** - File tree + history stored  
✅ **Realtime Updates** - Broadcast via Supabase  

---

**Last Updated:** January 2025  
**Status:** Production Ready ✅
