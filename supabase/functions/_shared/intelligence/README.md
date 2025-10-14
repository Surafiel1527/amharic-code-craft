# Universal Mega Mind Intelligence System

## Quick Start

### Basic Usage

```typescript
import { UniversalMegaMind } from '../_shared/intelligence/index.ts';

// Initialize
const megaMind = new UniversalMegaMind(supabase, LOVABLE_API_KEY);

// Process any user request
const result = await megaMind.processRequest({
  userRequest: "Add authentication to my app",
  userId: userId,
  conversationId: conversationId,
  projectId: projectId,
  existingFiles: projectFiles,
  framework: "react",
  context: conversationContext
});

// Access results
console.log(result.message);        // AI-generated natural language response
console.log(result.success);        // true/false
console.log(result.filesGenerated); // ['src/auth/Login.tsx', ...]
console.log(result.analysis);       // Full QueryAnalysis object
```

## Modules

### 1. Meta-Cognitive Analyzer
Analyzes user queries to determine intent, complexity, and strategy.

```typescript
import { MetaCognitiveAnalyzer } from './metaCognitiveAnalyzer.ts';

const analyzer = new MetaCognitiveAnalyzer(LOVABLE_API_KEY);
const analysis = await analyzer.analyzeQuery(userRequest, context);
```

### 2. Natural Communicator
Generates natural language messages dynamically.

```typescript
import { NaturalCommunicator } from './naturalCommunicator.ts';

const communicator = new NaturalCommunicator(LOVABLE_API_KEY);
const message = await communicator.generateStatusUpdate(context, analysis);
```

### 3. Adaptive Executor
Executes requests using the appropriate strategy.

```typescript
import { AdaptiveExecutor } from './adaptiveExecutor.ts';

const executor = new AdaptiveExecutor(supabase, communicator, LOVABLE_API_KEY);
const result = await executor.executeProgressive(context, analysis);
```

## Execution Modes

The system automatically selects one of four execution modes:

### Instant Mode
**When:** Simple, direct changes
**Example:** "Change button color to blue"
```typescript
// No planning, direct execution
result.analysis.executionStrategy.mode === 'instant'
```

### Progressive Mode
**When:** Complex multi-phase tasks
**Example:** "Add authentication system"
```typescript
// Multi-phase with validation
result.analysis.executionStrategy.mode === 'progressive'
result.analysis.complexity.estimatedPhases // 2-8 phases
```

### Conversational Mode
**When:** Questions or guidance requests
**Example:** "How does authentication work?"
```typescript
// No code changes, pure discussion
result.analysis.executionStrategy.mode === 'conversational'
```

### Hybrid Mode
**When:** Explanation + implementation
**Example:** "Explain and add payment system"
```typescript
// Explanation first, then execution
result.analysis.executionStrategy.mode === 'hybrid'
```

## Integration Example

### Edge Function Integration

```typescript
import { UniversalMegaMind } from '../_shared/intelligence/index.ts';

serve(async (req) => {
  const { userRequest, userId, conversationId, projectId } = await req.json();
  
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
  
  const megaMind = new UniversalMegaMind(supabase, LOVABLE_API_KEY);
  
  const result = await megaMind.processRequest({
    userRequest,
    userId,
    conversationId,
    projectId,
    existingFiles: context.files,
    framework: 'react',
    context: conversationHistory
  });
  
  // Broadcast AI-generated messages
  await broadcast('chat_response', {
    message: result.message,
    analysis: result.analysis,
    filesGenerated: result.filesGenerated
  });
  
  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

### Frontend Hook Integration

```typescript
import { useMutation } from '@tanstack/react-query';

const processMegaMindRequest = async (request: string) => {
  const { data } = await supabase.functions.invoke('mega-mind-orchestrator', {
    body: { 
      userRequest: request,
      userId: user.id,
      conversationId: currentConversation.id,
      projectId: currentProject?.id
    }
  });
  return data;
};

const { mutate: sendRequest } = useMutation({
  mutationFn: processMegaMindRequest,
  onSuccess: (data) => {
    // Display AI-generated message
    console.log(data.message); // Natural language response
    
    // Access execution details
    console.log(data.analysis.complexity.level);
    console.log(data.filesGenerated);
  }
});
```

## Response Structure

```typescript
interface ExecutionResult {
  success: boolean;              // Was execution successful?
  message: string;               // AI-generated natural language response
  filesGenerated?: string[];     // List of created/modified files
  duration: number;              // Execution time in ms
  error?: Error;                 // Error if failed
  analysis: QueryAnalysis;       // Full analysis object
}
```

## Analysis Object Structure

```typescript
interface QueryAnalysis {
  userIntent: {
    primaryGoal: string;           // Main objective
    secondaryGoals: string[];      // Related needs
    implicitNeeds: string[];       // Unspoken requirements
  };
  
  complexity: {
    level: 'trivial' | 'simple' | 'moderate' | 'complex' | 'expert';
    estimatedPhases: number;
    estimatedDuration: string;
    requiresPlanning: boolean;
    requiresValidation: boolean;
  };
  
  executionStrategy: {
    mode: 'instant' | 'progressive' | 'conversational' | 'hybrid';
    shouldThink: boolean;
    shouldPlan: boolean;
    shouldValidate: boolean;
    shouldIterate: boolean;
    maxIterations?: number;
  };
  
  communicationStyle: {
    tone: 'friendly' | 'professional' | 'technical' | 'casual';
    verbosity: 'concise' | 'detailed' | 'verbose';
    shouldExplain: boolean;
    shouldSummarize: boolean;
  };
  
  confidence: number;              // 0-1
  reasoning: string[];
  suggestedApproach: string;
}
```

## Broadcasting Status Updates

The system automatically generates and broadcasts status updates:

```typescript
// These are generated by the AI, not hardcoded!
await broadcast('status_update', {
  phase: 'analyzing',
  message: "I'm analyzing your request to understand what you need... 🔍"
});

await broadcast('status_update', {
  phase: 'building',
  message: "Creating the authentication pages with secure login... ⚙️",
  progress: 45
});

await broadcast('completion', {
  message: "All set! I've added a complete auth system with login, signup, and protected routes. What's next? 🎉",
  filesGenerated: ['src/auth/Login.tsx', 'src/auth/Signup.tsx']
});
```

## Error Handling

The system provides empathetic, actionable error messages:

```typescript
// Instead of: "Database connection failed"
// AI generates:
"Hmm, I couldn't connect to the database 😕 
It looks like the users table doesn't exist yet. 
Want me to create it for you?"
```

## Performance

- **Meta-Cognitive Analysis:** ~1-2 seconds
- **Status Generation:** ~0.5-1 second per message
- **Total Overhead:** ~2-4 seconds for intelligent routing
- **Benefit:** Perfect strategy selection saves minutes on complex tasks

## Advanced Features

### Getting Current Analysis

```typescript
const currentAnalysis = megaMind.getCurrentAnalysis();
console.log(currentAnalysis?.complexity.level);
```

### Resetting Communicator Context

```typescript
// Automatically done on new processRequest() calls
// Manual reset if needed:
communicator.resetContext();
```

## Architecture Diagram

```
User Request
     ↓
Universal Mega Mind
     ↓
Meta-Cognitive Analyzer → QueryAnalysis
     ↓
Adaptive Executor (selects mode)
     ↓
┌─────────┬──────────────┬───────────────┬─────────┐
│ Instant │ Progressive  │ Conversational│ Hybrid  │
└─────────┴──────────────┴───────────────┴─────────┘
     ↓
Natural Communicator → AI-generated messages
     ↓
User sees natural, contextual responses
```

## Testing

```typescript
// Test simple request
const simpleResult = await megaMind.processRequest({
  userRequest: "Change button color to blue",
  userId: 'test-user',
  conversationId: 'test-conv',
});
expect(simpleResult.analysis.executionStrategy.mode).toBe('instant');

// Test complex request
const complexResult = await megaMind.processRequest({
  userRequest: "Build a full authentication system with Google sign-in",
  userId: 'test-user',
  conversationId: 'test-conv',
});
expect(complexResult.analysis.executionStrategy.mode).toBe('progressive');
expect(complexResult.analysis.complexity.level).toBe('moderate');
```

## Best Practices

1. **Always await processRequest()** - It's async and returns comprehensive results
2. **Use the analysis object** - Contains valuable metadata about the request
3. **Broadcast messages to users** - The AI-generated messages are meant to be displayed
4. **Handle errors gracefully** - The system provides helpful error messages
5. **Trust the strategy** - The AI knows when to use instant vs progressive mode

## Migration from Legacy System

### Before (Legacy)
```typescript
const orchestrator = new MegaMindOrchestrator(supabase);
const decision = await orchestrator.understand(request);
// Manual execution logic...
```

### After (Universal Mega Mind)
```typescript
const megaMind = new UniversalMegaMind(supabase, LOVABLE_API_KEY);
const result = await megaMind.processRequest(request);
// Everything handled automatically!
```

## Troubleshooting

### Build Errors
Make sure all imports are correct:
```typescript
import { UniversalMegaMind } from '../_shared/intelligence/index.ts';
```

### AI Not Responding
Check that `LOVABLE_API_KEY` is set in Supabase secrets.

### Unexpected Execution Mode
Review the `QueryAnalysis` object to understand AI's reasoning:
```typescript
console.log(result.analysis.reasoning);
console.log(result.analysis.suggestedApproach);
```

## Support

For issues or questions:
- Check `UNIVERSAL_MEGA_MIND_ARCHITECTURE.md` for system design
- Review the source code in `supabase/functions/_shared/intelligence/`
- Consult the full codebase for integration examples
