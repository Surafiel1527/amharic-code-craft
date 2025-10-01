import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Zap, TrendingUp, Target, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const AISystemDocs = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Self-Improving AI System Documentation</h2>
        <p className="text-muted-foreground mt-2">
          Learn how your AI platform learns and improves itself automatically
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="workflow">Workflow</TabsTrigger>
          <TabsTrigger value="api">API Reference</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  What is Self-Improving AI?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  Your platform uses a cutting-edge self-improving AI system that learns from every interaction,
                  analyzes failures, and automatically improves its code generation capabilities.
                </p>
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">How It Works:</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Every AI generation is tracked with performance metrics</li>
                    <li>Failures and user feedback are analyzed weekly</li>
                    <li>AI uses meta-learning to improve its own prompts</li>
                    <li>New versions are tested and gradually rolled out</li>
                    <li>System continuously gets better over time</li>
                  </ol>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Key Benefits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span className="font-medium">Continuous Improvement</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      AI gets smarter with every generation
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      <span className="font-medium">Auto-Healing</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Automatically fixes known error patterns
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">A/B Testing</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Tests improvements before full rollout
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-purple-500" />
                      <span className="font-medium">Scheduled Learning</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Weekly automatic analysis and improvements
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="features">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Feature Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge>Analytics Tracking</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Every generation is tracked with:
                  </p>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>User prompt and generated code</li>
                    <li>Performance metrics (time, tokens, cost)</li>
                    <li>User feedback (thumbs up/down, ratings)</li>
                    <li>Success/failure status</li>
                    <li>Model used and prompt version</li>
                  </ul>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge>Meta-Improvement</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    AI analyzes its own failures and uses another AI to improve its system prompts.
                    This creates a feedback loop where the AI literally teaches itself to be better.
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge>Self-Healing</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    When errors occur, the system learns the pattern and solution. Next time the
                    same error happens, it automatically applies the known fix.
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge>Reflection Layer</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    AI critiques its own generated code, identifying potential issues before
                    users encounter them. This helps catch bugs early.
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge>Knowledge Base</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    A growing library of patterns, best practices, and solutions learned
                    from thousands of generations.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="workflow">
          <Card>
            <CardHeader>
              <CardTitle>Self-Improvement Workflow</CardTitle>
              <CardDescription>How the system evolves automatically</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="relative pl-8 pb-8 border-l-2 border-muted">
                  <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-primary"></div>
                  <h4 className="font-semibold">1. Generation & Tracking</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    User requests code → AI generates → System tracks everything (prompt, code, time, feedback)
                  </p>
                </div>

                <div className="relative pl-8 pb-8 border-l-2 border-muted">
                  <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-primary"></div>
                  <h4 className="font-semibold">2. Data Collection</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    All generations stored in database with performance metrics and user satisfaction scores
                  </p>
                </div>

                <div className="relative pl-8 pb-8 border-l-2 border-muted">
                  <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-primary"></div>
                  <h4 className="font-semibold">3. Weekly Analysis (Automated)</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Every Sunday at 2 AM, system analyzes last week's failures and calculates success rate
                  </p>
                </div>

                <div className="relative pl-8 pb-8 border-l-2 border-muted">
                  <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-primary"></div>
                  <h4 className="font-semibold">4. Meta-Improvement</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    If success rate {'<'} 90%, AI analyzes failures and generates improved system prompt
                  </p>
                </div>

                <div className="relative pl-8 pb-8 border-l-2 border-muted">
                  <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-primary"></div>
                  <h4 className="font-semibold">5. Version Creation</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    New prompt version created (v1.2.0 → v1.3.0) with documented improvements
                  </p>
                </div>

                <div className="relative pl-8 pb-8 border-l-2 border-muted">
                  <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-primary"></div>
                  <h4 className="font-semibold">6. Testing & Approval</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Admin reviews improvement, approves, and activates new version
                  </p>
                </div>

                <div className="relative pl-8">
                  <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-green-500"></div>
                  <h4 className="font-semibold">7. Deployment</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    New version goes live → Better generations → Cycle repeats 🔄
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Edge Functions API</CardTitle>
                <CardDescription>Available endpoints for AI improvement system</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <code className="text-sm font-mono">POST /meta-improve</code>
                    <Badge variant="outline">Admin Only</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Triggers manual meta-improvement analysis. Analyzes recent failures and generates new prompt version.
                  </p>
                </div>

                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <code className="text-sm font-mono">POST /self-heal</code>
                  <p className="text-sm text-muted-foreground">
                    Auto-fixes code errors using learned patterns. Pass generated code and error to get fixed version.
                  </p>
                </div>

                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <code className="text-sm font-mono">POST /ai-reflect</code>
                  <p className="text-sm text-muted-foreground">
                    AI critiques its own generated code. Returns quality score, improvements, and potential issues.
                  </p>
                </div>

                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <code className="text-sm font-mono">POST /scheduled-improvement</code>
                  <p className="text-sm text-muted-foreground">
                    Automated weekly improvement (runs via cron). Checks if improvement needed and executes if success rate {'<'} 90%.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Database Tables</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm space-y-2">
                  <code className="block bg-muted p-2 rounded">generation_analytics</code>
                  <p className="text-muted-foreground">Tracks every AI generation with metrics</p>
                </div>
                <div className="text-sm space-y-2">
                  <code className="block bg-muted p-2 rounded">prompt_versions</code>
                  <p className="text-muted-foreground">Stores system prompt versions with A/B testing support</p>
                </div>
                <div className="text-sm space-y-2">
                  <code className="block bg-muted p-2 rounded">error_patterns</code>
                  <p className="text-muted-foreground">Learned error patterns and their solutions</p>
                </div>
                <div className="text-sm space-y-2">
                  <code className="block bg-muted p-2 rounded">ai_knowledge_base</code>
                  <p className="text-muted-foreground">Best practices library built from experience</p>
                </div>
                <div className="text-sm space-y-2">
                  <code className="block bg-muted p-2 rounded">ai_improvements</code>
                  <p className="text-muted-foreground">History of all self-improvements</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};