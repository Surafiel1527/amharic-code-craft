# Self-Modifying System - Technical Architecture

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     User Interface Layer                     │
├─────────────────────────────────────────────────────────────┤
│  AdminSelfModifyChat → Supabase Edge Function              │
│        ↓                                                     │
│  [admin-self-modify] Edge Function                          │
│        ↓                                                     │
│  Lovable AI Gateway (Gemini 2.5 Flash)                     │
│        ↓                                                     │
│  Structured JSON Response                                   │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                    Database Layer                            │
├─────────────────────────────────────────────────────────────┤
│  admin_customizations table                                  │
│    - stores modification instructions                        │
│    - status: 'applied' (auto-apply)                         │
│    - applied_changes: JSON structure                         │
│                                                              │
│  admin_chat_messages table                                   │
│    - conversation history                                    │
│    - linked to customizations                                │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                    Runtime Layer                             │
├─────────────────────────────────────────────────────────────┤
│  useDynamicCustomizations Hook                               │
│    - fetches applied customizations                          │
│    - real-time subscription                                  │
│    - provides: getDynamicStyles, getDynamicContent, etc     │
│                                                              │
│  DynamicSlot Components                                      │
│    - render injected content                                 │
│    - handle visibility, styles, props                        │
│                                                              │
│  Component Registry                                          │
│    - pre-registered safe components                          │
│    - AI references by name                                   │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                    Render Layer                              │
├─────────────────────────────────────────────────────────────┤
│  Admin.tsx applies modifications:                            │
│    - Dynamic styles via className                            │
│    - Content injection via DynamicSlot                       │
│    - Visibility via isVisible()                              │
│    - Props via getDynamicProps()                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Core Components

### 1. **Edge Function: admin-self-modify**
`supabase/functions/admin-self-modify/index.ts`

**Purpose:** AI analysis and change generation

**Flow:**
```typescript
1. Receive prompt from user
2. Verify admin role
3. Fetch existing customizations
4. Build comprehensive AI prompt with:
   - Current state
   - Component registry docs
   - Architecture info
   - Usage examples
5. Call Lovable AI Gateway
6. Parse structured JSON response
7. Store in database with status: 'applied'
8. Return to frontend
```

**AI Prompt Structure:**
- System architecture details
- Component registry documentation
- Available slots and capabilities
- Modification examples
- Safety constraints
- Response format specification

**Response Schema:**
```typescript
{
  customization_type: string;
  analysis: string;
  changes: {
    description: string;
    component: string;
    modifications: Array<{
      type: 'add' | 'modify' | 'remove' | 'hide' | 'show';
      target: string;
      styles?: string;
      content?: string;
      props?: Record<string, any>;
      order?: number;
      visibility?: boolean;
    }>;
  };
  implementation_steps: string[];
  confidence: number;
}
```

---

### 2. **Hook: useDynamicCustomizations**
`src/hooks/useDynamicCustomizations.ts`

**Purpose:** Fetch and manage runtime customizations

**API:**
```typescript
const {
  customizations,        // All applied customizations
  loading,              // Loading state
  getDynamicStyles,     // Get CSS classes for component
  getDynamicContent,    // Get injected content
  isVisible,            // Check component visibility
  getDynamicProps,      // Get dynamic props
  getOrder              // Get display order
} = useDynamicCustomizations();
```

**Features:**
- Real-time Supabase subscription
- Automatic refetch on changes
- Safe JSON parsing with error handling
- Type-safe modification extraction

**Subscription:**
```typescript
supabase
  .channel('admin-customizations')
  .on('postgres_changes', { 
    table: 'admin_customizations',
    filter: 'status=eq.applied'
  }, () => loadCustomizations())
```

---

### 3. **Component: DynamicSlot**
`src/components/DynamicSlot.tsx`

**Purpose:** Render AI-injected content in designated areas

**Usage:**
```tsx
<DynamicSlot 
  name="header-actions" 
  fallback={<DefaultButton />}
  className="flex gap-2"
/>
```

**How It Works:**
1. Queries `getDynamicContent(name)` for modifications
2. If content exists, renders it with dynamic styles
3. Otherwise renders fallback or children
4. Applies any CSS modifications

**Slots in Admin Page:**
- `header-actions` - Top right header
- `stats-extra` - Below stats cards
- `mobile-menu` - Mobile sidebar
- `tab-content` - Custom tabs

---

### 4. **Component Registry**
`src/lib/componentRegistry.tsx`

**Purpose:** Safe, pre-approved components AI can use

**Structure:**
```typescript
{
  componentName: {
    component: ReactComponent,
    props: PropTypes,
    description: string,
    examples: string[],
    category: 'layout' | 'data' | 'ui' | 'icon' | 'feedback'
  }
}
```

**50+ Registered Components:**
- Layout: Card, Table, etc.
- UI: Button, Badge, Alert
- Icons: 30+ Lucide icons
- Data: Tables, Charts

**AI Integration:**
- Automatically documented in AI prompt
- Components referenced by name
- Type-safe prop validation
- Category-based organization

---

## 🔄 Data Flow

### Modification Request Flow

```
User types: "Change background to blue"
         ↓
AdminSelfModifyChat component
         ↓
Supabase Edge Function: admin-self-modify
         ↓
Lovable AI Gateway (Gemini 2.5 Flash)
         ↓
Structured JSON: {
  component: "AdminPage",
  modifications: [{
    type: "modify",
    styles: "bg-blue-500"
  }]
}
         ↓
Database: admin_customizations table
  status: 'applied'
  applied_changes: {JSON above}
         ↓
Real-time Supabase Event
         ↓
useDynamicCustomizations refetches
         ↓
Admin.tsx reads: getDynamicStyles('AdminPage')
         ↓
className={`${dynamicStyles}`}
         ↓
Component re-renders with blue background
```

---

## 🗄️ Database Schema

### Table: admin_customizations

```sql
CREATE TABLE admin_customizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  prompt TEXT NOT NULL,
  customization_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  applied_changes JSONB NOT NULL,
  code_changes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  applied_at TIMESTAMPTZ
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime 
ADD TABLE admin_customizations;
```

**Fields:**
- `prompt`: Original user request
- `customization_type`: style | feature | content | layout | visibility
- `status`: 'applied' (auto-applied in this system)
- `applied_changes`: Structured JSON with modifications
- `code_changes`: Full AI response for debugging

---

### Table: admin_chat_messages

```sql
CREATE TABLE admin_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role TEXT NOT NULL,  -- 'user' | 'assistant'
  content TEXT NOT NULL,
  customization_id UUID REFERENCES admin_customizations(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🎯 Modification Types

### 1. Style Modifications
```json
{
  "type": "modify",
  "component": "AdminPage",
  "styles": "bg-gradient-to-br from-blue-50 to-blue-200"
}
```
**Implementation:**
```tsx
const styles = getDynamicStyles('AdminPage');
<div className={`base-classes ${styles}`}>
```

---

### 2. Content Injection
```json
{
  "type": "add",
  "component": "stats-extra",
  "content": "<Card>...</Card>"
}
```
**Implementation:**
```tsx
<DynamicSlot name="stats-extra" />
```

---

### 3. Visibility Control
```json
{
  "type": "hide",
  "component": "NotificationCenter"
}
```
**Implementation:**
```tsx
{isVisible('NotificationCenter') && <NotificationCenter />}
```

---

### 4. Props Modification
```json
{
  "type": "modify",
  "component": "Button",
  "props": { "variant": "destructive", "size": "lg" }
}
```
**Implementation:**
```tsx
const props = getDynamicProps('Button');
<Button {...props} />
```

---

### 5. Reordering
```json
{
  "type": "modify",
  "component": "stat-card-users",
  "order": 3
}
```
**Implementation:**
```tsx
const order = getOrder('stat-card-users');
<div style={{ order }}>
```

---

## 🔒 Security

### Input Validation
- Admin role verification in edge function
- RLS policies on database tables
- SQL injection prevention via parameterized queries

### Output Sanitization
- HTML content sanitized before rendering
- Only registered components allowed
- No JavaScript execution in injected content

### Scope Limitations
- Cannot modify authentication logic
- Cannot access other users' data
- Cannot change database schema
- Cannot import new dependencies

### Rate Limiting
- Lovable AI Gateway handles rate limits
- 429 and 402 errors properly surfaced
- User-friendly error messages

---

## 🚀 Performance

### Optimization Strategies

**1. Lazy Loading**
- Customizations loaded only on admin page
- Not affecting public pages

**2. Real-time Subscriptions**
- Single subscription channel
- Efficient postgres_changes filtering

**3. Memoization**
```typescript
const getDynamicStyles = useMemo(
  () => (component: string) => {...},
  [customizations]
);
```

**4. Batched Updates**
- Multiple modifications in single transaction
- Reduced database roundtrips

---

## 🧪 Testing Strategy

### Unit Tests
- Hook behavior (getDynamicStyles, etc.)
- Component rendering (DynamicSlot)
- Registry lookups

### Integration Tests
- End-to-end modification flow
- Real-time subscription updates
- Edge function responses

### Safety Tests
- Malicious input rejection
- Auth bypass attempts
- XSS prevention

---

## 🔮 Future Enhancements

### Phase 2: Advanced Features
- **Preview Mode**: Test changes before applying
- **Rollback UI**: One-click revert
- **Version Control**: Track modification history
- **Collaboration**: Multiple admins editing simultaneously

### Phase 3: True Code Generation
- **GitHub Integration**: Create PRs automatically
- **File Modifications**: Update actual source files
- **Component Generation**: Create new React components
- **Testing Integration**: Auto-run tests before applying

### Phase 4: AI Improvements
- **Learning**: Remember user preferences
- **Suggestions**: Proactive improvement recommendations
- **Context Awareness**: Understand app state and user behavior
- **Natural Conversations**: Multi-turn dialogs for complex changes

---

## 📚 Related Documentation

- **User Guide**: `SELF_MODIFICATION_GUIDE.md`
- **Component Registry**: `src/lib/componentRegistry.tsx`
- **API Reference**: Edge function inline docs
- **Database Schema**: Supabase migrations

---

## 🐛 Troubleshooting

### Common Issues

**Changes not applying:**
- Check realtime subscription active
- Verify status='applied' in database
- Check browser console for errors

**AI misunderstanding requests:**
- Improve system prompt with more examples
- Add context about current state
- Provide clearer component documentation

**Performance degradation:**
- Audit number of active customizations
- Optimize getDynamicStyles algorithm
- Consider caching strategies

---

**Last Updated:** January 2025  
**Version:** 1.0.0  
**Status:** Production Ready ✅
