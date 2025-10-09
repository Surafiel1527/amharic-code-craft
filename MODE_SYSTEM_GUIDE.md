# Mega Mind Mode System

## Overview

The Mega Mind orchestrator now supports two distinct operation modes to handle different user workflows:

### 1. **Generate Mode** (`mode: 'generate'`)
**When:** User creates a new project from Index page dropdown (HTML/React selection)

**Behavior:**
- Creates a **brand new** project from scratch
- No existing code is loaded
- Sets up complete infrastructure (database, auth, etc.) if needed
- Returns fully functional standalone application
- Triggers authentication setup automatically when auth keywords detected

**Use Case:** "Generate a React todo app with login"

---

### 2. **Enhance Mode** (`mode: 'enhance'`)  
**When:** User chats in Workspace with existing project

**Behavior:**
- Loads and analyzes **existing project code**
- Makes **surgical modifications** only to requested features
- Respects existing architecture and patterns
- Does NOT recreate existing features
- Only triggers auth setup when explicitly requested (not just when "user" mentioned)

**Use Case:** "Add database storage to the Notes App so users can save notes"

---

## Implementation

### Frontend (Chat Hook)
```typescript
// src/hooks/useUniversalAIChat.ts
export interface UniversalAIChatOptions {
  // ...
  mode?: 'generate' | 'enhance'; // Default: 'enhance'
}
```

### Frontend (Workspace)
```tsx
<UniversalChatInterface
  operationMode="enhance"  // Always enhance in workspace
  projectId={projectId}
  // ... other props
/>
```

### Backend (Orchestrator)
```typescript
// supabase/functions/mega-mind-orchestrator/index.ts
const { mode = 'enhance' } = await req.json();

// Pass to analysis
const analysis = await analyzeRequest(request, requestType, { ...context, mode });

// Auth detection now respects mode
const needsAuth = mode === 'generate' && request.match(/login|signup|auth/);
```

---

## Key Differences

| Feature | Generate Mode | Enhance Mode |
|---------|---------------|--------------|
| Starting point | Clean slate | Existing code |
| Auth setup | Auto-triggered | Only if explicit |
| Output | Complete app | Surgical changes |
| Context | None needed | Loads project files |
| User keyword | Triggers auth | Ignored (common word) |

---

## Bug Fixes Included

1. **Fixed Auth Over-Triggering**: Word "user" or "users" no longer triggers authentication setup in enhance mode
2. **Context Loading**: Mode determines whether to load existing project files
3. **Smart Detection**: Orchestrator understands the difference between "create new" vs "modify existing"

---

## Example Scenarios

### Scenario 1: Generate New
```
User: [Selects React from dropdown]
Input: "Create a blog with comments"
Mode: generate
Result: Brand new React blog app with auth, database, components
```

### Scenario 2: Enhance Existing
```
User: [In workspace with Notes App]
Input: "Add database storage so users can save notes"
Mode: enhance
Result: Only adds database table + save functionality, doesn't recreate auth
```

---

## Testing

To verify the mode system works:

1. **Generate Mode**: Create new project from Index → Should create complete app
2. **Enhance Mode**: Open workspace → Request changes → Should only modify requested features
3. **Auth Bug**: Say "users can save notes" in enhance mode → Should NOT trigger auth setup
