# Reasoning-Based AI Agent System
## Project Vision & Agreement

**Last Updated:** 2025-01-XX  
**Status:** Planning Phase  
**Goal:** Build an AI agent that REASONS like Lovable (Claude), not one that follows templates

---

## 🎯 Core Principle

**"Structure as Information Container, NOT Decision Tree"**

We are building an AI that:
- ✅ Receives organized context (structure)
- ✅ Reasons freely about what to do (intelligence)
- ❌ Does NOT follow predefined paths (no templates)
- ❌ Does NOT use intent classification to route actions

---

## 🧠 What We're Building

### System Name: **Reasoning Agent**

An AI system that works like Lovable itself:

1. **Learns the entire project** (Phase 1: Project Intelligence)
2. **Retrieves relevant context** based on what's needed (Phase 2: Smart Context)
3. **Reasons about ANY request** and decides what to do (Phase 3: Reasoning Execution)

---

## 📋 The Three Phases

### **Phase 1: Project Intelligence (Initial Learning)**
**Status:** ✅ APPROVED - Working as designed

The AI learns everything about the project:
```typescript
{
  files: { path: content },
  components: [...discovered components...],
  routes: [...routes map...],
  dependencies: [...packages...],
  design_system: { colors, tokens, patterns },
  database: { tables, relationships },
  features: [...implemented features...]
}
```

**How it works:**
- Scans entire codebase on first load
- Builds comprehensive knowledge graph
- Stores in `project_intelligence` table
- Updates automatically when files change

---

### **Phase 2: Smart Context Retrieval**
**Status:** ✅ APPROVED - Working as designed

For each user request, retrieve ONLY what's relevant:
```typescript
// User asks: "add dark mode toggle to navbar"
// AI retrieves:
{
  navbar_file: "src/components/Navbar.tsx",
  theme_system: "index.css theme tokens",
  similar_components: "ThemeToggle pattern if exists"
}

// User asks: "where is the login page?"
// AI retrieves:
{
  routes: "/auth/login route",
  auth_files: ["Login.tsx", "auth context"]
}
```

**How it works:**
- AI analyzes user request
- Determines what context is needed (not intent classification!)
- Fetches only relevant files/knowledge
- Provides to reasoning engine

---

### **Phase 3: Reasoning Execution** ⭐
**Status:** 🔥 THIS IS WHAT WE'RE BUILDING NOW

**THE CRITICAL DIFFERENCE:**

#### ❌ Template Approach (What We DON'T Want):
```typescript
// Bad: Intent determines action
const intent = classifyIntent(userRequest);

if (intent === 'code_generation') {
  runCodeGenerator();
} else if (intent === 'explanation') {
  runExplainer();
} else if (intent === 'navigation') {
  runNavigator();
}
```

#### ✅ Reasoning Approach (What We DO Want):
```typescript
// Good: AI reasons with full context
const fullContext = {
  projectKnowledge: learned_intelligence,
  relevantFiles: smart_retrieved_context,
  userRequest: "add dark mode toggle to navbar",
  availableCapabilities: [
    'writeCode',
    'explainConcepts', 
    'debugErrors',
    'navigateCode',
    'suggestImprovements'
  ]
};

// Send EVERYTHING to AI
const aiResponse = await AI.reason(`
You are an AI assistant with complete knowledge of this project.

PROJECT CONTEXT:
${JSON.stringify(fullContext.projectKnowledge)}

RELEVANT FILES FOR THIS REQUEST:
${fullContext.relevantFiles}

USER REQUEST:
"${fullContext.userRequest}"

YOUR CAPABILITIES:
${fullContext.availableCapabilities.join(', ')}

INSTRUCTIONS:
1. Understand what the user wants
2. Decide what to do (you can use multiple capabilities)
3. Explain your reasoning
4. Execute the necessary actions
5. Respond naturally

You are NOT limited to one action. You can:
- Write code AND explain it
- Fix bugs AND suggest improvements
- Answer questions AND show examples
- Anything that makes sense for this request
`);

// AI decides freely what to do
```

---

## 🔑 Key Design Decisions

### 1. **No Intent Classification**
- We don't categorize requests as "code_edit" or "explanation"
- AI receives the request and decides what it means
- AI can do multiple things (code + explain + suggest)

### 2. **No Action Routing**
- We don't route to CodeExecutor or ExplainExecutor
- AI has access to ALL capabilities and chooses what to use
- Structure organizes information, NOT control flow

### 3. **AI Has Full Agency**
```typescript
// AI can respond however it wants:

// User: "add dark mode to navbar"
// AI might do:
- Generate code for toggle component
- Update navbar to include it
- Explain how it works
- Suggest where else to add theme support
- Show example of usage

// User: "where is auth handled?"
// AI might do:
- Show the auth files
- Explain the authentication flow
- Point out security considerations
- Suggest improvements if it sees issues
```

### 4. **Context is Organized but Not Prescriptive**
```typescript
// We provide structure:
{
  project: {...},
  files: {...},
  request: "...",
  capabilities: [...]
}

// But AI reasons freely:
"User wants X. I see Y in the codebase. 
I should do Z because..."
```

---

## 🏗️ Technical Architecture

### Core Components:

```
┌─────────────────────────────────────────────────┐
│          User Request                           │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│   Phase 1: Project Intelligence                 │
│   (Already learned everything)                  │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│   Phase 2: Smart Context Retrieval              │
│   (Get only what's relevant)                    │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│   Phase 3: Reasoning Execution                  │
│                                                 │
│   ┌─────────────────────────────────────────┐  │
│   │  AI Reasoning Engine                     │  │
│   │                                          │  │
│   │  Receives:                               │  │
│   │  - Full project knowledge                │  │
│   │  - Relevant context                      │  │
│   │  - User request                          │  │
│   │  - Available capabilities                │  │
│   │                                          │  │
│   │  Decides:                                │  │
│   │  - What does user want?                  │  │
│   │  - What should I do?                     │  │
│   │  - How should I do it?                   │  │
│   │  - What should I explain?                │  │
│   │                                          │  │
│   │  Executes:                               │  │
│   │  - Generates code if needed              │  │
│   │  - Explains concepts if helpful          │  │
│   │  - Suggests improvements if relevant     │  │
│   │  - Debugs errors if found                │  │
│   │  - ANY COMBINATION of above              │  │
│   └─────────────────────────────────────────┘  │
│                                                 │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│   Natural Language Response to User             │
│   (AI explains what it did and why)             │
└─────────────────────────────────────────────────┘
```

---

## 🎨 How AI Capabilities Work

### Available Capabilities (Tools):

```typescript
const capabilities = {
  // Code Operations
  writeCode: async (files) => { /* write new code */ },
  modifyCode: async (path, changes) => { /* edit existing */ },
  deleteCode: async (path) => { /* remove files */ },
  
  // Knowledge Operations
  explainConcept: (topic) => { /* explain how something works */ },
  navigateCode: (query) => { /* find and show code locations */ },
  
  // Analysis Operations
  debugError: (error) => { /* diagnose and fix */ },
  suggestImprovement: () => { /* proactive suggestions */ },
  
  // Communication
  respond: (message) => { /* natural language response */ }
};
```

### AI Decides What to Use:
```typescript
// User: "add authentication"
// AI reasons:
"This requires:
1. Code generation (auth components)
2. Explanation (how it works)
3. Suggestion (security best practices)

I'll use: writeCode + explainConcept + suggestImprovement"

// User: "why is my button not working?"
// AI reasons:
"This is a debugging task.
1. Navigate to button code
2. Diagnose the issue
3. Suggest fix
4. Explain the problem

I'll use: navigateCode + debugError + explainConcept"
```

---

## 📝 Implementation Plan

### Step 1: Build Reasoning Engine Core
**File:** `supabase/functions/_shared/reasoning/core.ts`

```typescript
export class ReasoningEngine {
  async reason(context: FullContext): Promise<AIDecision> {
    // Build comprehensive prompt
    const prompt = this.buildReasoningPrompt(context);
    
    // Call AI (Lovable AI / Gemini)
    const aiResponse = await this.callAI(prompt);
    
    // AI returns its reasoning and decisions
    return aiResponse;
  }
  
  private buildReasoningPrompt(context: FullContext): string {
    return `
      You are an AI coding assistant with complete project knowledge.
      
      PROJECT KNOWLEDGE:
      ${JSON.stringify(context.projectKnowledge, null, 2)}
      
      RELEVANT FILES:
      ${context.relevantFiles}
      
      USER REQUEST:
      "${context.userRequest}"
      
      AVAILABLE CAPABILITIES:
      ${context.capabilities.map(c => `- ${c.name}: ${c.description}`).join('\n')}
      
      INSTRUCTIONS:
      1. Understand the user's request deeply
      2. Reason about what needs to be done
      3. Decide which capabilities to use (can be multiple)
      4. Execute those capabilities
      5. Respond naturally explaining what you did
      
      Think step-by-step. You have full agency.
    `;
  }
}
```

### Step 2: Integrate with Existing System
**File:** `supabase/functions/_shared/intelligence/index.ts`

Update `UniversalMegaMind` to use reasoning:

```typescript
export class UniversalMegaMind {
  private reasoningEngine: ReasoningEngine;
  
  async processRequest(request: UniversalMindRequest) {
    // Phase 1: Get project knowledge (already learned)
    const projectKnowledge = await this.getProjectIntelligence(request.projectId);
    
    // Phase 2: Retrieve relevant context
    const relevantContext = await this.smartContextRetrieval(
      request.userRequest,
      projectKnowledge
    );
    
    // Phase 3: AI REASONING (NEW!)
    const aiDecision = await this.reasoningEngine.reason({
      projectKnowledge,
      relevantContext,
      userRequest: request.userRequest,
      capabilities: this.getAvailableCapabilities()
    });
    
    // Execute what AI decided
    return await this.executeAIDecision(aiDecision);
  }
}
```

### Step 3: Remove Template Logic
**Files to update:**
- Remove intent classification
- Remove action routing
- Remove predefined flows
- Keep only: reasoning engine + capabilities

---

## ✅ Success Criteria

Our system is successful when:

1. **AI Can Handle ANY Request Type**
   - User asks for code → AI generates it
   - User asks "where is X?" → AI explains and shows
   - User asks "how does Y work?" → AI explains the concept
   - User asks "add feature Z" → AI codes it and explains
   - **NO hardcoded categories needed**

2. **AI Reasons Contextually**
   - "Add button" when button exists → AI suggests edit or clarifies
   - "Add dark mode" when theme exists → AI integrates with existing
   - "Fix auth" when auth works → AI asks what's wrong
   - **AI uses project knowledge to reason**

3. **AI Has Full Agency**
   - Can write code + explain + suggest in one response
   - Can ask clarifying questions when needed
   - Can suggest better approaches
   - **Not limited to one action type**

4. **Natural Conversation**
   - Responses feel like talking to Lovable
   - AI explains its reasoning
   - AI is proactive and helpful
   - **Not robotic template responses**

---

## 🤝 Our Agreement

### What We're Building:
- ✅ Reasoning-based AI agent
- ✅ Full project awareness
- ✅ Natural, intelligent responses
- ✅ Free-form decision making

### What We're NOT Building:
- ❌ Template-based intent classifier
- ❌ Hardcoded action routing
- ❌ Predefined response flows
- ❌ Rule-based decision trees

### The Core Philosophy:
> **"Give the AI all the context and let it reason. Trust the intelligence, not the templates."**

---

## 📊 Current Status

- [x] Phase 1: Project Intelligence - COMPLETE
- [x] Phase 2: Smart Context Retrieval - COMPLETE
- [ ] Phase 3: Reasoning Execution - IN PROGRESS
  - [ ] Build ReasoningEngine core
  - [ ] Integrate with UniversalMegaMind
  - [ ] Remove template logic
  - [ ] Test with various request types
  - [ ] Deploy and validate

---

## 🚀 Next Steps

1. **Review This Document**
   - User reads and approves
   - Discuss any concerns
   - Agree on approach

2. **Implement ReasoningEngine**
   - Create core reasoning logic
   - Build comprehensive prompts
   - Connect to AI models

3. **Refactor UniversalMegaMind**
   - Remove intent classification
   - Remove action routing
   - Integrate reasoning engine

4. **Test & Validate**
   - Try various request types
   - Ensure natural responses
   - Verify AI reasoning quality

---

## 📖 Appendix: Key Insights

### Why This Approach?

**From our conversation:**
- User: "When you said this is also template, you're right"
- AI: "Structure as INPUT vs Structure as LOGIC"
- User: "Do you choose those procedures by yourself or you're intended to follow those steps?"
- AI: "I'm designed to reason, but not following predefined paths"

### The Breakthrough Understanding:
```
Template System: Structure → Decision → Action
Reasoning System: Structure → AI Thinks → Whatever Makes Sense
```

### What Makes This Different:
1. No intent classification determining flow
2. No action routing based on categories
3. AI receives EVERYTHING and decides
4. Structure organizes info, AI controls logic

---

**Document Status:** DRAFT - Awaiting User Approval  
**Next Action:** User reviews, discusses, and we proceed to implementation
