import { SmartChatBuilder } from "@/components/SmartChatBuilder";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Shield, GitBranch } from "lucide-react";

export default function AISystemTest() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold flex items-center justify-center gap-3">
            <Brain className="w-10 h-10 text-primary" />
            AI System Test Suite
          </h1>
          <p className="text-muted-foreground text-lg">
            Test all three advanced AI features: Self-Healing, Multi-File Generation, and Version Control
          </p>
        </div>

        <Tabs defaultValue="builder" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="builder">AI Builder</TabsTrigger>
            <TabsTrigger value="healing">Self-Healing Test</TabsTrigger>
            <TabsTrigger value="multifile">Multi-File Test</TabsTrigger>
            <TabsTrigger value="version">Version Control Test</TabsTrigger>
          </TabsList>

          <TabsContent value="builder" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  Smart Chat Builder
                </CardTitle>
                <CardDescription>
                  Main interface with all three features integrated
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SmartChatBuilder />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="healing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Self-Healing System Test
                </CardTitle>
                <CardDescription>
                  Test automatic error detection and fixing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <h3 className="font-semibold">Test Instructions:</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Open the Self-Healing Monitor (Activity icon in builder)</li>
                    <li>The system automatically monitors for errors</li>
                    <li>Generate some code that might have errors to test</li>
                    <li>Check the monitor for detected errors</li>
                    <li>Verify auto-fixes are generated and applied</li>
                  </ol>
                </div>

                <div className="p-4 border rounded-lg space-y-2">
                  <h3 className="font-semibold text-sm">✅ Features to Verify:</h3>
                  <ul className="text-sm space-y-1">
                    <li>✓ Error detection works</li>
                    <li>✓ AI generates fixes with confidence scores</li>
                    <li>✓ High-confidence fixes (≥80%) auto-apply</li>
                    <li>✓ Verification runs before applying</li>
                    <li>✓ Health status updates in real-time</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="multifile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="w-5 h-5" />
                  Multi-File Generation Test
                </CardTitle>
                <CardDescription>
                  Test generating multiple organized files in one request
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <h3 className="font-semibold">Test Instructions:</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Use the Smart Chat Builder above</li>
                    <li>Try a prompt like: "Create a complete user authentication system with login, signup, auth hook, and types"</li>
                    <li>Verify multiple files are generated in response</li>
                    <li>Check file organization (components/, hooks/, types/)</li>
                    <li>Verify consistency across generated files</li>
                  </ol>
                </div>

                <div className="p-4 border rounded-lg space-y-2">
                  <h3 className="font-semibold text-sm">Example Prompts to Try:</h3>
                  <ul className="text-sm space-y-2">
                    <li className="p-2 bg-background rounded">
                      <strong>Auth System:</strong> "Create complete authentication with login, signup, hooks, and API utilities"
                    </li>
                    <li className="p-2 bg-background rounded">
                      <strong>Dashboard:</strong> "Build a dashboard with sidebar, header, and 3 chart components"
                    </li>
                    <li className="p-2 bg-background rounded">
                      <strong>CRUD Feature:</strong> "Generate a todo app with list, form, hooks, and types"
                    </li>
                  </ul>
                </div>

                <div className="p-4 border border-primary/20 bg-primary/5 rounded-lg">
                  <p className="text-sm">
                    <strong>💡 Tip:</strong> The AI will automatically organize files into proper directories and maintain consistent patterns across all generated files.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="version" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="w-5 h-5" />
                  Version Control & Snapshots Test
                </CardTitle>
                <CardDescription>
                  Test snapshot creation and restoration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <h3 className="font-semibold">Test Instructions:</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Generate some code using the builder</li>
                    <li>Click the Snapshot icon (Save icon) in the builder</li>
                    <li>Create a named snapshot with description</li>
                    <li>Make more changes to the code</li>
                    <li>Open snapshots again and restore previous version</li>
                    <li>Verify the code reverts to the snapshot state</li>
                  </ol>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg space-y-2">
                    <h3 className="font-semibold text-sm">📦 Manual Snapshots:</h3>
                    <ul className="text-sm space-y-1">
                      <li>✓ Create named snapshots</li>
                      <li>✓ Add descriptions</li>
                      <li>✓ Visual screenshots</li>
                      <li>✓ One-click restore</li>
                      <li>✓ Delete old snapshots</li>
                    </ul>
                  </div>

                  <div className="p-4 border rounded-lg space-y-2">
                    <h3 className="font-semibold text-sm">🔄 Auto Versions:</h3>
                    <ul className="text-sm space-y-1">
                      <li>✓ Auto-created on changes</li>
                      <li>✓ Change summaries</li>
                      <li>✓ Version numbers</li>
                      <li>✓ Restore any version</li>
                      <li>✓ Full history tracking</li>
                    </ul>
                  </div>
                </div>

                <div className="p-4 border border-green-500/20 bg-green-500/5 rounded-lg">
                  <p className="text-sm">
                    <strong>✨ Best Practice:</strong> Create snapshots before major experiments or refactoring. This gives you a safety net to revert if needed.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">🎯 Testing Checklist</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Self-Healing
                </h3>
                <ul className="text-sm space-y-1">
                  <li>□ Errors are detected</li>
                  <li>□ Fixes generated with confidence</li>
                  <li>□ Auto-apply works (≥80%)</li>
                  <li>□ Verification runs</li>
                  <li>□ Health status updates</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <GitBranch className="w-4 h-4" />
                  Multi-File
                </h3>
                <ul className="text-sm space-y-1">
                  <li>□ Multiple files generated</li>
                  <li>□ Proper file organization</li>
                  <li>□ Consistent code style</li>
                  <li>□ Follows file structure</li>
                  <li>□ Complete features</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <GitBranch className="w-4 h-4" />
                  Version Control
                </h3>
                <ul className="text-sm space-y-1">
                  <li>□ Snapshots created</li>
                  <li>□ Screenshots captured</li>
                  <li>□ Restore works</li>
                  <li>□ Auto-versions created</li>
                  <li>□ Version history visible</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
