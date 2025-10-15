import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  Database, 
  MessageSquare, 
  FileCode, 
  GitBranch,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Zap,
  FolderTree
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

/**
 * Complete Architecture Documentation
 * Shows how the autonomous AI system works end-to-end
 */
export default function AutonomousAIArchitecture() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-primary/5 to-background p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4 py-8">
          <div className="flex items-center justify-center gap-3">
            <Brain className="h-10 w-10 text-primary" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Autonomous AI Architecture
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            How the AI autonomously understands, plans, and builds your projects
            <br />
            <strong className="text-primary">No templates. No restrictions. Pure intelligence.</strong>
          </p>
        </div>

        <Tabs defaultValue="flow" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="flow">Complete Flow</TabsTrigger>
            <TabsTrigger value="context">Context & Memory</TabsTrigger>
            <TabsTrigger value="framework">Framework Detection</TabsTrigger>
            <TabsTrigger value="optimization">Optimization</TabsTrigger>
          </TabsList>

          {/* Complete Flow */}
          <TabsContent value="flow" className="space-y-6">
            <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-primary" />
                End-to-End Autonomous Flow
              </h2>
              <p className="text-muted-foreground mb-6">
                From your request to working code - AI decides everything autonomously
              </p>

              <div className="space-y-4">
                {/* Step 1 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xl font-bold text-primary">1</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">User Request + Workspace Context</h3>
                    <Card className="p-4 bg-card/50">
                      <pre className="text-sm overflow-x-auto">
{`// Frontend calls universal-router
const response = await supabase.functions.invoke('universal-router', {
  body: {
    request: "Create a coffee shop website",
    userId: "user-123",
    projectId: "project-456",        // 🎯 Where to work
    conversationId: "conv-789",       // 💬 Conversation history
    context: {
      framework: "react"               // Optional hint
    }
  }
});`}
                      </pre>
                    </Card>
                    <div className="mt-2 text-sm text-muted-foreground">
                      <strong className="text-primary">✓ projectId:</strong> AI knows which workspace/files to work on
                      <br />
                      <strong className="text-accent">✓ conversationId:</strong> AI has full conversation history
                      <br />
                      <strong className="text-success">✓ userId:</strong> AI knows who's requesting
                    </div>
                  </div>
                </div>

                <div className="flex justify-center">
                  <ArrowRight className="h-6 w-6 text-muted-foreground" />
                </div>

                {/* Step 2 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                    <span className="text-xl font-bold text-accent">2</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">Universal Router (Thin Proxy)</h3>
                    <Card className="p-4 bg-card/50">
                      <pre className="text-sm overflow-x-auto">
{`// universal-router simply forwards to mega-mind
const { data } = await supabase.functions.invoke('mega-mind', {
  body: { request, userId, projectId, conversationId, ...context }
});

// NO routing logic - AI decides everything`}
                      </pre>
                    </Card>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Single entry point - all requests go to mega-mind for autonomous processing
                    </p>
                  </div>
                </div>

                <div className="flex justify-center">
                  <ArrowRight className="h-6 w-6 text-muted-foreground" />
                </div>

                {/* Step 3 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                    <span className="text-xl font-bold text-success">3</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">Meta-Cognitive Analyzer (AI Brain)</h3>
                    <Card className="p-4 bg-card/50">
                      <pre className="text-sm overflow-x-auto">
{`// AI analyzes query autonomously
const analysis = await analyzer.analyzeQuery(request, {
  projectId,
  conversationId,
  existingContext: await getProjectContext(projectId)  // 📁 Loads existing files
});

// AI decides:
// - What user really wants
// - Complexity level
// - Framework needed (HTML/React/etc)
// - Execution strategy (instant/progressive/conversational)
// - File structure
// - Components needed`}
                      </pre>
                    </Card>
                    <div className="mt-3 space-y-2">
                      <Badge className="mr-2">
                        <Database className="h-3 w-3 mr-1" />
                        Loads existing project files
                      </Badge>
                      <Badge variant="secondary" className="mr-2">
                        <MessageSquare className="h-3 w-3 mr-1" />
                        Reads conversation history
                      </Badge>
                      <Badge variant="outline">
                        <Brain className="h-3 w-3 mr-1" />
                        AI determines everything
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center">
                  <ArrowRight className="h-6 w-6 text-muted-foreground" />
                </div>

                {/* Step 4 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                    <span className="text-xl font-bold text-green-600">4</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">Adaptive Executor (Dynamic Strategy)</h3>
                    <Card className="p-4 bg-card/50">
                      <pre className="text-sm overflow-x-auto">
{`// AI chooses execution mode autonomously
switch (analysis.executionStrategy.primaryApproach) {
  case 'instant':
    // Fast single-shot for simple requests
    result = await executor.executeInstant(context, analysis);
    break;
  case 'progressive':
    // Step-by-step with validation for complex projects
    result = await executor.executeProgressive(context, analysis);
    break;
  case 'conversational':
    // Interactive with questions for unclear requests
    result = await executor.executeConversational(context, analysis);
    break;
  case 'hybrid':
    // Combines multiple strategies
    result = await executor.executeHybrid(context, analysis);
    break;
}`}
                      </pre>
                    </Card>
                  </div>
                </div>

                <div className="flex justify-center">
                  <ArrowRight className="h-6 w-6 text-muted-foreground" />
                </div>

                {/* Step 5 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">Natural Communicator (AI Messages)</h3>
                    <Card className="p-4 bg-card/50">
                      <pre className="text-sm overflow-x-auto">
{`// AI generates ALL messages - no templates
const message = await communicator.generateStatusUpdate({
  phase: 'building',
  taskDescription: request,
  filesAffected: ['App.tsx', 'CoffeeMenu.tsx'],
  metadata: { projectId, conversationId }
}, analysis);

// Broadcasts via Supabase Realtime
await broadcastStatus(channelId, message.content);

// Frontend displays in AIThinkingPanel
// Shows: "Building your coffee shop components..." (AI-generated)`}
                      </pre>
                    </Card>
                    <p className="mt-2 text-sm text-success">
                      ✓ Every message is AI-generated and contextual
                      <br />
                      ✓ No hardcoded templates anywhere
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Context & Memory */}
          <TabsContent value="context" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Database className="h-6 w-6 text-primary" />
                How Context & Memory Works
              </h2>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <FolderTree className="h-5 w-5 text-accent" />
                    1. File Tree is Saved in Database
                  </h3>
                  <Card className="p-4 bg-muted/30">
                    <pre className="text-sm overflow-x-auto">
{`// Project files are stored in 'projects' table
interface Project {
  id: string;                  // projectId
  user_id: string;
  title: string;
  html_code: string;           // For HTML projects
  css_code: string;
  js_code: string;
  // OR for React/complex projects:
  file_tree: {                 // 📁 Complete file structure
    'src/App.tsx': string,
    'src/components/Menu.tsx': string,
    'src/styles.css': string,
    // ... all files
  };
  framework: 'html' | 'react';
  created_at: timestamp;
  updated_at: timestamp;
}

// AI loads this EVERY time:
const project = await supabase
  .from('projects')
  .select('*')
  .eq('id', projectId)
  .single();

// AI sees ALL existing files before deciding what to change`}
                    </pre>
                  </Card>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-success" />
                    2. Conversation History is Preserved
                  </h3>
                  <Card className="p-4 bg-muted/30">
                    <pre className="text-sm overflow-x-auto">
{`// Conversations table stores full history
interface Conversation {
  id: string;                  // conversationId
  user_id: string;
  project_id: string;
  messages: Array<{
    role: 'user' | 'assistant',
    content: string,
    timestamp: string
  }>;
}

// AI reads conversation when analyzing:
const conversation = await supabase
  .from('conversations')
  .select('*')
  .eq('id', conversationId)
  .single();

// Example: User's conversation history
// User: "Create a coffee shop website"
// AI: "Created with menu and gallery"
// User: "Add a contact form"  ← AI knows to ADD, not rebuild
// AI: Sees previous context, only adds contact form component`}
                    </pre>
                  </Card>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    3. AI Combines Everything Autonomously
                  </h3>
                  <Card className="p-4 bg-primary/5">
                    <div className="space-y-3 text-sm">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
                        <div>
                          <strong>First Generation:</strong> AI creates file tree from scratch based on request
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
                        <div>
                          <strong>Subsequent Updates:</strong> AI loads existing files + conversation history
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
                        <div>
                          <strong>Smart Decisions:</strong> AI determines if it should modify, add, or rebuild
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
                        <div>
                          <strong>Context Awareness:</strong> AI knows what user asked before and what exists now
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Framework Detection */}
          <TabsContent value="framework" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <GitBranch className="h-6 w-6 text-primary" />
                How AI Detects Framework (HTML vs React)
              </h2>

              <div className="space-y-6">
                <Card className="p-4 bg-accent/5">
                  <h3 className="font-semibold mb-3">Option 1: User Explicitly Selects</h3>
                  <pre className="text-sm bg-card/50 p-3 rounded overflow-x-auto">
{`// If user selects from dropdown
const response = await supabase.functions.invoke('universal-router', {
  body: {
    request: "Create a portfolio",
    framework: "react",    // ← Explicit selection
    projectId, userId, conversationId
  }
});

// AI respects the choice`}
                  </pre>
                </Card>

                <Card className="p-4 bg-primary/5">
                  <h3 className="font-semibold mb-3">Option 2: AI Detects Autonomously</h3>
                  <pre className="text-sm bg-card/50 p-3 rounded overflow-x-auto">
{`// If no framework specified, AI analyzes the request
const analysis = await analyzer.analyzeQuery(request);

// AI checks:
analysis.technicalRequirements = {
  framework: // AI decides based on:
    - Request complexity
    - User's language ("React app", "simple website")
    - Project requirements (interactivity needs)
    - Existing project context (if updating)
}

// Examples of AI detection:
"Create a simple landing page" → HTML
"Build a todo app with state" → React  
"Make an interactive dashboard" → React
"Add a contact form" (to existing HTML) → Stays HTML
"Add user auth" (to existing React) → Stays React`}
                  </pre>
                </Card>

                <Card className="p-4 bg-success/5">
                  <h3 className="font-semibold mb-3">Option 3: Loads from Existing Project</h3>
                  <pre className="text-sm bg-card/50 p-3 rounded overflow-x-auto">
{`// For modifications/updates
const project = await getProjectContext(projectId);

if (project.framework) {
  // AI uses existing framework
  framework = project.framework;
} else if (project.file_tree?.['src/App.tsx']) {
  // AI detects React from file structure
  framework = 'react';
} else if (project.html_code) {
  // AI detects HTML
  framework = 'html';
}

// AI NEVER breaks existing architecture`}
                  </pre>
                </Card>
              </div>
            </Card>
          </TabsContent>

          {/* Optimization */}
          <TabsContent value="optimization" className="space-y-6">
            <Card className="p-6 bg-gradient-to-br from-primary/5 via-accent/5 to-success/5">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Zap className="h-6 w-6 text-primary" />
                Full Potential Optimizations
              </h2>

              <div className="space-y-4">
                <div className="p-4 border-l-4 border-primary bg-card">
                  <h3 className="font-semibold text-lg mb-2">✅ Current Strengths</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• <strong>Autonomous Decision Making:</strong> No hardcoded routing</li>
                    <li>• <strong>Full Context Awareness:</strong> Loads files + conversation history</li>
                    <li>• <strong>Natural Communication:</strong> AI-generated messages</li>
                    <li>• <strong>Adaptive Strategies:</strong> Chooses best execution mode</li>
                    <li>• <strong>Framework Agnostic:</strong> Handles HTML, React, etc.</li>
                  </ul>
                </div>

                <div className="p-4 border-l-4 border-accent bg-card">
                  <h3 className="font-semibold text-lg mb-2">🚀 Optimization Opportunities</h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <strong className="text-accent">1. Caching & Performance</strong>
                      <pre className="mt-2 bg-muted/30 p-3 rounded text-xs">
{`// Cache project context to avoid repeated DB queries
const cachedContext = await redis.get(\`project:\${projectId}\`);
if (!cachedContext) {
  const context = await loadProjectContext(projectId);
  await redis.set(\`project:\${projectId}\`, context, { ex: 300 });
}`}
                      </pre>
                    </div>

                    <div>
                      <strong className="text-accent">2. Incremental Updates (Smart Diffs)</strong>
                      <pre className="mt-2 bg-muted/30 p-3 rounded text-xs">
{`// Instead of regenerating everything:
const changes = await ai.determineSurgicalChanges(request, existingFiles);
// AI generates ONLY the needed changes, not full files
// Example: "Add button" → only generates button component`}
                      </pre>
                    </div>

                    <div>
                      <strong className="text-accent">3. Parallel File Generation</strong>
                      <pre className="mt-2 bg-muted/30 p-3 rounded text-xs">
{`// Generate multiple independent files simultaneously
const files = await Promise.all([
  ai.generate('HomePage'),
  ai.generate('AboutPage'),  
  ai.generate('ContactPage')
]);
// 3x faster than sequential`}
                      </pre>
                    </div>

                    <div>
                      <strong className="text-accent">4. Proactive Suggestions</strong>
                      <pre className="mt-2 bg-muted/30 p-3 rounded text-xs">
{`// After each generation, AI suggests next steps
const suggestions = await ai.analyzeCompleteness(generatedCode);
// "I noticed you might want to add:
//  - Dark mode toggle
//  - Mobile menu
//  - Loading states"`}
                      </pre>
                    </div>

                    <div>
                      <strong className="text-accent">5. Conflict Detection & Auto-Merge</strong>
                      <pre className="mt-2 bg-muted/30 p-3 rounded text-xs">
{`// Detect if multiple users/sessions modified same files
const conflicts = await detectConflicts(projectId, newChanges);
if (conflicts.length > 0) {
  // AI auto-resolves or asks user
  const resolved = await ai.resolveConflicts(conflicts);
}`}
                      </pre>
                    </div>
                  </div>
                </div>

                <div className="p-4 border-l-4 border-success bg-card">
                  <h3 className="font-semibold text-lg mb-2">🎯 Recommended Next Steps</h3>
                  <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                    <li>Add request caching to avoid re-analyzing identical requests</li>
                    <li>Implement file-level versioning for rollback capabilities</li>
                    <li>Add real-time collaboration (multiple users on same project)</li>
                    <li>Enhance progress broadcasts with file-by-file updates</li>
                    <li>Add AI-powered code review after each generation</li>
                  </ol>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Summary */}
        <Card className="p-6 bg-gradient-to-r from-primary/10 to-accent/10">
          <h2 className="text-2xl font-bold mb-4">🎯 Summary: How It All Works Together</h2>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-semibold mb-2 text-primary">When User Selects Framework & Generates:</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>✓ Dropdown value sent as `framework: "react"` or `"html"`</li>
                <li>✓ AI respects choice or detects from request if not specified</li>
                <li>✓ Universal Router → Mega Mind → Analyzer → Executor</li>
                <li>✓ AI generates file structure based on framework</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-accent">When User Asks to Update/Add Features:</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>✓ AI loads existing files from `projectId`</li>
                <li>✓ AI reads conversation history from `conversationId`</li>
                <li>✓ AI understands context: what exists + what was requested before</li>
                <li>✓ AI makes surgical updates or additions, not full rewrites</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
