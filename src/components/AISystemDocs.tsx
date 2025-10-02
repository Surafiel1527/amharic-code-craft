import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Brain, Shield, GitBranch, Zap, FileCode, Database } from "lucide-react";

export const AISystemDocs = () => {
  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">🧠 Advanced AI System</h1>
        <p className="text-muted-foreground">
          Self-healing, multi-file generation, and intelligent version control
        </p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="healing">Self-Healing</TabsTrigger>
          <TabsTrigger value="multifile">Multi-File</TabsTrigger>
          <TabsTrigger value="version">Versions</TabsTrigger>
          <TabsTrigger value="memory">Memory</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                System Capabilities
              </CardTitle>
              <CardDescription>
                Advanced features for building complex applications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader>
                    <Shield className="w-8 h-8 text-primary mb-2" />
                    <CardTitle className="text-lg">Self-Healing</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    Automatically detects, analyzes, and fixes errors in real-time with AI-powered solutions.
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <FileCode className="w-8 h-8 text-primary mb-2" />
                    <CardTitle className="text-lg">Multi-File Generation</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    Generate complete feature modules with multiple organized files in a single request.
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <GitBranch className="w-8 h-8 text-primary mb-2" />
                    <CardTitle className="text-lg">Version Control</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    Create snapshots, track changes, and restore to any previous state instantly.
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="healing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Self-Healing System
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">How it Works:</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>🔍 <strong>Error Detection:</strong> Monitors runtime errors, API failures, and build issues</li>
                  <li>🧠 <strong>AI Analysis:</strong> Uses Gemini 2.5 to analyze error context and codebase</li>
                  <li>🔧 <strong>Auto-Fix Generation:</strong> Creates targeted fixes with confidence scores</li>
                  <li>✅ <strong>Verification:</strong> Tests fixes automatically before applying</li>
                  <li>↩️ <strong>Rollback:</strong> Automatically reverts if fix doesn't work</li>
                  <li>📚 <strong>Learning:</strong> Stores successful patterns for future use</li>
                </ol>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Features:</h3>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">High-confidence auto-apply (≥80%)</Badge>
                  <Badge variant="outline">Manual review for complex issues</Badge>
                  <Badge variant="outline">Error pattern recognition</Badge>
                  <Badge variant="outline">Proactive monitoring</Badge>
                  <Badge variant="outline">Duplicate error prevention</Badge>
                </div>
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm">
                  <strong>💡 Pro Tip:</strong> The system learns from every fix. The more you use it, 
                  the smarter it gets at preventing similar issues.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="multifile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCode className="w-5 h-5" />
                Multi-File Generation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Capabilities:</h3>
                <ul className="list-disc list-inside space-y-2 text-sm">
                  <li>Generate complete feature modules with multiple files</li>
                  <li>Automatic code splitting and organization</li>
                  <li>Maintains consistent patterns across files</li>
                  <li>Creates components, hooks, utils, types, and pages</li>
                  <li>Follows project structure and conventions</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Example Request:</h3>
                <div className="bg-muted p-4 rounded-lg text-sm font-mono">
                  "Create a user authentication feature with:<br/>
                  - Login component<br/>
                  - Signup component<br/>
                  - Auth hook for state management<br/>
                  - Auth types<br/>
                  - API utility functions"
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Generated Files:</h3>
                <div className="space-y-1 text-sm font-mono">
                  <div>📄 src/components/LoginForm.tsx</div>
                  <div>📄 src/components/SignupForm.tsx</div>
                  <div>📄 src/hooks/useAuth.ts</div>
                  <div>📄 src/types/auth.ts</div>
                  <div>📄 src/utils/authApi.ts</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="version" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="w-5 h-5" />
                Version Control & Snapshots
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Features:</h3>
                <ul className="list-disc list-inside space-y-2 text-sm">
                  <li><strong>Auto-Versioning:</strong> Every significant change creates a version</li>
                  <li><strong>Manual Snapshots:</strong> Save important states with custom names</li>
                  <li><strong>One-Click Restore:</strong> Revert to any previous version instantly</li>
                  <li><strong>Visual Previews:</strong> See screenshots of saved states</li>
                  <li><strong>Change Summaries:</strong> Track what changed in each version</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Use Cases:</h3>
                <div className="space-y-2">
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm"><strong>🧪 Experimentation:</strong> Try different approaches without fear</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm"><strong>🔄 Iterations:</strong> Keep working versions while testing new features</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm"><strong>🎯 Milestones:</strong> Save important project states</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="memory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Intelligent Project Memory
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">What Gets Remembered:</h3>
                <ul className="list-disc list-inside space-y-2 text-sm">
                  <li><strong>Project Architecture:</strong> Overall structure and design patterns</li>
                  <li><strong>Tech Stack:</strong> Libraries, frameworks, and tools used</li>
                  <li><strong>Implemented Features:</strong> What's already built</li>
                  <li><strong>Code Structure:</strong> Classes, functions, components</li>
                  <li><strong>Recent Changes:</strong> Latest modifications and updates</li>
                  <li><strong>Custom Instructions:</strong> Your specific guidelines and preferences</li>
                  <li><strong>File Structure:</strong> Organization and naming conventions</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Benefits:</h3>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Consistent code style</Badge>
                  <Badge variant="secondary">Better context awareness</Badge>
                  <Badge variant="secondary">Faster generation</Badge>
                  <Badge variant="secondary">Fewer errors</Badge>
                  <Badge variant="secondary">Maintains project patterns</Badge>
                </div>
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm">
                  <strong>🎯 Custom Instructions:</strong> Set project-specific guidelines to ensure 
                  the AI always follows your preferred patterns and conventions.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Quick Start Guide
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">1️⃣ Set Up Instructions</h3>
                <p className="text-sm mb-2">Click the Settings icon and define:</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  <li>Project structure and file organization</li>
                  <li>Naming conventions</li>
                  <li>Coding standards</li>
                  <li>Specific requirements</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">2️⃣ Generate Code</h3>
                <div className="space-y-2 text-sm">
                  <p><strong>Single File:</strong> "Create a user profile component"</p>
                  <p><strong>Multiple Files:</strong> "Create a complete authentication system with login, signup, and auth management"</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">3️⃣ Let It Heal</h3>
                <p className="text-sm">
                  When errors occur, the system automatically detects and fixes them. 
                  Check the Self-Healing Monitor to see the magic happen!
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">4️⃣ Save Important States</h3>
                <p className="text-sm">
                  Create snapshots before major changes. You can always restore if needed.
                </p>
              </div>

              <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg">
                <p className="text-sm font-semibold mb-2">💡 Pro Tips:</p>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  <li>Be specific in your requests for better results</li>
                  <li>Use multi-file generation for complex features</li>
                  <li>Review auto-fixes in the monitor dashboard</li>
                  <li>Create snapshots before experimental changes</li>
                  <li>Update custom instructions as your project evolves</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
