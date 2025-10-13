# Master System Prompt Analysis & Implementation Plan

**Date:** January 13, 2025

---

## 📋 Executive Summary

Gemini's recommendations propose a **Master System Prompt** architecture that turns an AI from a simple tool into a dynamic, context-aware coding assistant. This analysis compares their recommendations with our existing Phase 4 autonomous learning system and provides an implementation roadmap.

---

## 🎯 Gemini's Key Recommendations

### **1. Core Identity & Purpose**
- Clear AI persona with defined role
- Explicit purpose and behavior guidelines
- Patient, meticulous, collaborative approach

### **2. Strict Interaction Protocol**
```json
{
  "INPUT": {
    "currentFiles": "Complete project state as JSON",
    "userInstruction": "Developer's request"
  },
  "OUTPUT": {
    "thought": "Step-by-step reasoning",
    "plan": "High-level action steps",
    "files": "Only changed/new files",
    "messageToUser": "Friendly explanation"
  }
}
```

### **3. Operational Directives**
1. **Modify, Don't Regenerate** - Edit existing code intelligently
2. **Context is King** - Analyze entire codebase before changes
3. **Handle Complexity with Plans** - Propose before implementing large changes
4. **Clarify Vagueness** - Ask questions for unclear requests
5. **Be Explicit & Complete** - Provide full file content, no snippets

### **4. Virtual File System**
- Maintain complete project state
- Track all files in session
- Update state incrementally

### **5. Master Prompt Architecture**
- Single foundational instruction set
- Sent with every API call
- Governs all AI behavior

---

## 🔍 What We Currently Have

### ✅ **Existing Strengths**

#### **1. Phase 4 Autonomous Learning System** (COMPLETE)
- ✅ Admin approval workflow
- ✅ Prompt evolution engine
- ✅ UX-pattern integration
- ✅ Unified dashboard
- ✅ Pattern learning with confidence scoring
- ✅ Autonomous healing engine

#### **2. AI Integration Infrastructure**
**File:** `supabase/functions/_shared/`
- ✅ `aiHelpers.ts` - AI utility functions
- ✅ `aiPrompts.ts` - Prompt templates
- ✅ `aiWithFallback.ts` - Resilient AI calls
- ✅ `promptEvolution.ts` - Automatic prompt improvement
- ✅ `conversationMemory.ts` - Context management

#### **3. Codebase Analysis**
**File:** `supabase/functions/_shared/codebaseAnalyzer.ts`
- ✅ Analyzes project structure
- ✅ Detects frameworks
- ✅ Identifies dependencies
- ✅ Maps file relationships

#### **4. Context Management**
**File:** `supabase/functions/_shared/contextHelpers.ts`
- ✅ Manages conversation context
- ✅ Tracks user interactions
- ✅ Maintains session state

#### **5. Implementation Planning**
**File:** `supabase/functions/_shared/implementationPlanner.ts`
- ✅ Generates execution plans
- ✅ Breaks down complex tasks
- ✅ Provides fallback strategies

#### **6. Pattern Recognition**
**File:** `supabase/functions/_shared/patternLearning.ts`
- ✅ Learns from successful patterns
- ✅ Confidence-based pattern selection
- ✅ Success rate tracking

#### **7. Feature Orchestration**
**File:** `supabase/functions/_shared/featureOrchestrator.ts`
- ✅ Manages complex feature requests
- ✅ Dependency resolution
- ✅ Phase-based implementation

#### **8. Database Tables for Learning**
- ✅ `ai_prompts` - Prompt performance tracking
- ✅ `learned_patterns` - Pattern library
- ✅ `admin_approval_queue` - Human oversight
- ✅ `ux_quality_correlations` - UX feedback loop
- ✅ `pattern_confidence_history` - Confidence tracking

---

## ❌ What We're Missing

### **1. Master System Prompt**
- ❌ No foundational instruction set
- ❌ No unified AI identity/persona
- ❌ No explicit operational directives
- ❌ Prompts are scattered across different files

### **2. Strict JSON Protocol**
- ❌ No standardized input/output format
- ❌ Responses aren't structured consistently
- ❌ No `thought`, `plan`, `files` separation

### **3. Virtual File System**
- ❌ No complete project state tracking
- ❌ No session-based file management
- ❌ Changes aren't tracked incrementally

### **4. Proposal/Confirmation Flow**
- ❌ Complex tasks don't request confirmation
- ❌ No "plan first, implement later" workflow
- ❌ Changes happen immediately without review option

### **5. Vagueness Clarification System**
- ❌ No structured approach to unclear requests
- ❌ AI attempts to guess rather than ask
- ❌ No clarification prompt templates

### **6. Modify-Don't-Regenerate Enforcement**
- ❌ No explicit directive to edit vs regenerate
- ❌ AI might rewrite entire files unnecessarily
- ❌ No incremental change tracking

### **7. Session State Management**
- ❌ No persistent project state per user
- ❌ Context resets between requests
- ❌ No "memory" of recent changes

---

## 🚀 Implementation Plan

### **Phase 5A: Master System Prompt Foundation** (6-8 hours)

#### **1. Create Master Prompt System**
**File:** `supabase/functions/_shared/masterSystemPrompt.ts`

```typescript
export const MASTER_SYSTEM_PROMPT = `
## CORE IDENTITY & PURPOSE ##
You are a world-class AI Software Engineer integrated into the Lovable platform.
Your purpose is to collaborate with developers to build, evolve, and refactor
software projects intelligently and efficiently.

## INTERACTION PROTOCOL ##
You will receive:
- currentFiles: Complete project state
- userInstruction: Developer's request
- sessionContext: Recent conversation history
- learnedPatterns: Relevant patterns from knowledge base

You will respond with:
- thought: Your reasoning process
- plan: Step-by-step execution plan
- files: Only files that need changes (full content)
- messageToUser: Clear, helpful explanation
- clarificationNeeded: Questions if request is unclear
- complexityLevel: 'simple' | 'moderate' | 'complex'

## OPERATIONAL DIRECTIVES ##
1. PRIME DIRECTIVE: Modify existing code intelligently, don't regenerate
2. CONTEXT AWARENESS: Analyze all files before making changes
3. PROPOSE FIRST: For complex tasks, show plan and wait for confirmation
4. CLARIFY VAGUENESS: Ask questions for unclear requests
5. LEARN FROM FEEDBACK: Use patterns from knowledge base
6. MAINTAIN CONSISTENCY: Match existing code style and architecture
`;

export function buildEnhancedPrompt(
  userInstruction: string,
  projectState: ProjectState,
  sessionContext: ConversationContext,
  learnedPatterns: Pattern[]
): string {
  return `${MASTER_SYSTEM_PROMPT}

### CURRENT PROJECT STATE ###
${JSON.stringify(projectState, null, 2)}

### SESSION CONTEXT ###
${JSON.stringify(sessionContext, null, 2)}

### RELEVANT PATTERNS ###
${JSON.stringify(learnedPatterns, null, 2)}

### USER INSTRUCTION ###
${userInstruction}

### YOUR RESPONSE (JSON) ###`;
}
```

#### **2. Virtual File System Manager**
**File:** `supabase/functions/_shared/virtualFileSystem.ts`

```typescript
export interface ProjectState {
  sessionId: string;
  userId: string;
  projectId: string;
  files: Record<string, string>; // path -> content
  lastModified: Record<string, Date>;
  changeHistory: FileChange[];
}

export class VirtualFileSystem {
  async getProjectState(sessionId: string): Promise<ProjectState>
  async updateFiles(sessionId: string, changes: Record<string, string>): Promise<void>
  async trackChange(sessionId: string, change: FileChange): Promise<void>
  async getRecentChanges(sessionId: string, limit: number): Promise<FileChange[]>
}
```

#### **3. Structured Response Handler**
**File:** `supabase/functions/_shared/structuredResponseHandler.ts`

```typescript
export interface AIResponse {
  thought: string;
  plan: string[];
  files: Record<string, string>;
  messageToUser: string;
  clarificationNeeded?: string[];
  complexityLevel: 'simple' | 'moderate' | 'complex';
  requiresConfirmation: boolean;
}

export function parseAIResponse(rawResponse: string): AIResponse
export function validateResponseStructure(response: AIResponse): boolean
```

#### **4. Proposal/Confirmation System**
**File:** `supabase/functions/_shared/proposalSystem.ts`

```typescript
export class ProposalSystem {
  async createProposal(
    sessionId: string,
    plan: string[],
    estimatedChanges: number
  ): Promise<Proposal>
  
  async waitForConfirmation(proposalId: string): Promise<boolean>
  
  async executeProposal(
    proposalId: string,
    projectState: ProjectState
  ): Promise<ExecutionResult>
}
```

#### **5. Vagueness Clarification System**
**File:** `supabase/functions/_shared/clarificationSystem.ts`

```typescript
export const CLARIFICATION_TEMPLATES = {
  styleRequest: "What specific style did you have in mind? (e.g., modern, minimalist, colorful)",
  bugFix: "Can you describe the bug? What is the expected vs actual behavior?",
  feature: "Can you provide more details about this feature's requirements?",
  refactor: "What aspect should I refactor? (e.g., structure, performance, readability)"
};

export function detectVagueness(instruction: string): string[]
export function generateClarificationQuestions(vagueness: string[]): string[]
```

---

### **Phase 5B: Intelligent Context System** (4-6 hours)

#### **1. Session State Manager**
**Table:** `ai_sessions`
```sql
CREATE TABLE ai_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID,
  session_data JSONB NOT NULL, -- Virtual file system
  last_activity TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### **2. Change Tracking System**
**Table:** `file_changes`
```sql
CREATE TABLE file_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  file_path TEXT NOT NULL,
  old_content TEXT,
  new_content TEXT NOT NULL,
  change_type TEXT NOT NULL, -- 'create' | 'modify' | 'delete'
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### **3. Proposal Queue System**
**Table:** `code_proposals`
```sql
CREATE TABLE code_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  plan JSONB NOT NULL,
  estimated_files INTEGER NOT NULL,
  complexity_level TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected' | 'executed'
  user_response TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ
);
```

---

### **Phase 5C: Enhanced Edge Function** (6-8 hours)

#### **Mega Mind Orchestrator v2**
**File:** `supabase/functions/mega-mind-orchestrator-v2/index.ts`

```typescript
import { MASTER_SYSTEM_PROMPT, buildEnhancedPrompt } from '../_shared/masterSystemPrompt.ts';
import { VirtualFileSystem } from '../_shared/virtualFileSystem.ts';
import { ProposalSystem } from '../_shared/proposalSystem.ts';
import { parseAIResponse, validateResponseStructure } from '../_shared/structuredResponseHandler.ts';

serve(async (req) => {
  const { userInstruction, sessionId } = await req.json();
  
  // 1. Load session state
  const vfs = new VirtualFileSystem();
  const projectState = await vfs.getProjectState(sessionId);
  
  // 2. Get relevant context
  const sessionContext = await getSessionContext(sessionId);
  const learnedPatterns = await getRelevantPatterns(userInstruction);
  
  // 3. Build enhanced prompt with master instructions
  const enhancedPrompt = buildEnhancedPrompt(
    userInstruction,
    projectState,
    sessionContext,
    learnedPatterns
  );
  
  // 4. Call AI with structured prompt
  const aiResponse = await callLovableAI(enhancedPrompt);
  const structured = parseAIResponse(aiResponse);
  
  // 5. Handle based on complexity
  if (structured.complexityLevel === 'complex' || structured.requiresConfirmation) {
    // Create proposal and wait for confirmation
    const proposal = await proposalSystem.createProposal(
      sessionId,
      structured.plan,
      Object.keys(structured.files).length
    );
    
    return {
      type: 'proposal',
      proposal,
      messageToUser: structured.messageToUser
    };
  }
  
  // 6. Handle clarification needs
  if (structured.clarificationNeeded && structured.clarificationNeeded.length > 0) {
    return {
      type: 'clarification',
      questions: structured.clarificationNeeded,
      messageToUser: structured.messageToUser
    };
  }
  
  // 7. Simple changes - apply immediately
  await vfs.updateFiles(sessionId, structured.files);
  
  // 8. Track changes for rollback capability
  for (const [filePath, content] of Object.entries(structured.files)) {
    await vfs.trackChange(sessionId, {
      file_path: filePath,
      new_content: content,
      change_type: 'modify',
      reason: userInstruction
    });
  }
  
  return {
    type: 'success',
    files: structured.files,
    messageToUser: structured.messageToUser,
    thought: structured.thought
  };
});
```

---

## 📊 Comparison Matrix

| Feature | Gemini Recommendation | Our Current System | Gap Analysis |
|---------|----------------------|-------------------|--------------|
| **Master Prompt** | ✅ Foundational instruction set | ❌ Scattered prompts | HIGH PRIORITY |
| **JSON Protocol** | ✅ Strict input/output format | ⚠️ Partial structure | MEDIUM PRIORITY |
| **Virtual File System** | ✅ Complete state tracking | ❌ No VFS | HIGH PRIORITY |
| **Proposal Flow** | ✅ Plan before execute | ❌ Immediate execution | HIGH PRIORITY |
| **Clarification System** | ✅ Structured questions | ⚠️ Basic attempts | MEDIUM PRIORITY |
| **Context Awareness** | ✅ Analyze all files | ✅ Codebase analyzer | ✓ HAVE THIS |
| **Pattern Learning** | ⚠️ Not mentioned | ✅ Phase 4 system | ✓ WE'RE AHEAD |
| **Admin Oversight** | ⚠️ Not mentioned | ✅ Admin approvals | ✓ WE'RE AHEAD |
| **UX Integration** | ⚠️ Not mentioned | ✅ UX-pattern feedback | ✓ WE'RE AHEAD |
| **Session Management** | ✅ Persistent state | ❌ Stateless | HIGH PRIORITY |
| **Modify-Not-Regenerate** | ✅ Explicit directive | ⚠️ Implicit | MEDIUM PRIORITY |

---

## 🎯 Advantages We Already Have

Our Phase 4 system provides **capabilities beyond Gemini's recommendations:**

### **1. Autonomous Learning**
- ✅ AI learns from successes and failures
- ✅ Patterns improve over time
- ✅ Confidence-based decision making

### **2. Human Oversight**
- ✅ Admin approval workflow
- ✅ Rejection with reasons
- ✅ Audit trail

### **3. UX-Driven Improvements**
- ✅ Frustration score monitoring
- ✅ Confidence adjustment based on UX
- ✅ Automatic intervention triggers

### **4. Self-Healing**
- ✅ Automatic error detection
- ✅ Fix generation and application
- ✅ Validation cycles

---

## 💡 Hybrid Approach Recommendation

**Combine Gemini's structured approach with our autonomous learning:**

```typescript
// Phase 5: Master System + Autonomous Learning
export class IntelligentCodeAssistant {
  masterPrompt: MasterSystemPrompt;
  virtualFileSystem: VirtualFileSystem;
  proposalSystem: ProposalSystem;
  patternLearning: PatternLearningSystem; // Our Phase 4
  autonomousHealing: HealingEngine; // Our Phase 4
  adminApproval: ApprovalSystem; // Our Phase 4
  
  async processRequest(instruction: string, sessionId: string) {
    // 1. Use master prompt for structure
    const structuredResponse = await this.masterPrompt.generate(instruction);
    
    // 2. Check learned patterns for optimization
    const patterns = await this.patternLearning.getRelevantPatterns(instruction);
    
    // 3. Propose if complex
    if (structuredResponse.complexityLevel === 'complex') {
      return await this.proposalSystem.createProposal(structuredResponse);
    }
    
    // 4. Apply changes
    const files = await this.virtualFileSystem.applyChanges(structuredResponse.files);
    
    // 5. Autonomous healing check
    const errors = await this.autonomousHealing.detectIssues(files);
    if (errors.length > 0) {
      await this.autonomousHealing.autoFix(errors);
    }
    
    // 6. Learn from this interaction
    await this.patternLearning.recordSuccess(instruction, files);
    
    return { files, message: structuredResponse.messageToUser };
  }
}
```

---

## 🚀 Implementation Timeline

### **Week 1: Foundation** (20 hours)
- ✅ Phase 5A: Master System Prompt (8 hours)
- ✅ Phase 5B: Session State Management (6 hours)
- ✅ Database migrations (2 hours)
- ✅ Testing infrastructure (4 hours)

### **Week 2: Integration** (20 hours)
- ✅ Phase 5C: Enhanced Edge Function (8 hours)
- ✅ Virtual File System implementation (6 hours)
- ✅ Proposal/Confirmation UI (4 hours)
- ✅ Integration with Phase 4 systems (2 hours)

### **Week 3: Polish** (16 hours)
- ✅ Clarification system refinement (4 hours)
- ✅ Performance optimization (4 hours)
- ✅ Error handling improvements (4 hours)
- ✅ Documentation and examples (4 hours)

**Total Time Investment:** ~56 hours (~1.5 weeks full-time)

---

## 🎉 Expected Outcomes

After implementing Phase 5, the platform will have:

1. **✅ Structured Intelligence** - Master prompt governing all AI behavior
2. **✅ Stateful Sessions** - Complete project state tracking
3. **✅ Proposal Workflow** - Review before complex changes
4. **✅ Clarification System** - Smart handling of vague requests
5. **✅ Autonomous Learning** - AI that improves from every interaction
6. **✅ Human Oversight** - Admin control over critical improvements
7. **✅ Self-Healing** - Automatic error detection and fixing
8. **✅ UX Integration** - Confidence based on user experience

**Result:** A truly intelligent, self-improving AI coding assistant that combines the best of structured prompting with autonomous learning.

---

## 🔮 Next Steps

Would you like me to:
1. **Start with Phase 5A** - Implement Master System Prompt foundation?
2. **Create database migrations** - Set up session state tables?
3. **Build prototype** - Demo the proposal/confirmation flow?
4. **Integrate with Phase 4** - Connect to existing learning systems?

The choice is yours! 🚀
