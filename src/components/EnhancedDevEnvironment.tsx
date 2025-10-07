import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Terminal, Code, Package, AlertCircle, CheckCircle } from "lucide-react";
import { WebTerminal } from "./WebTerminal";
import ReactGenerationHub from "./ReactGenerationHub";
import { Button } from "./ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function EnhancedDevEnvironment() {
  const [systemStatus, setSystemStatus] = useState({
    terminal: true,
    codeExecution: true,
    packageManager: true,
    aiOrchestrator: true
  });

  const checkSystemHealth = async () => {
    toast.info("🔍 Checking system health...");
    
    const checks = await Promise.all([
      supabase.functions.invoke('code-executor', { body: { code: 'return "OK"', language: 'javascript' } }),
      supabase.functions.invoke('unified-package-manager', { body: { operation: 'auto_detect' } }),
      supabase.functions.invoke('mega-mind-orchestrator', { body: { request: 'health check', requestType: 'system' } })
    ]);

    setSystemStatus({
      terminal: true,
      codeExecution: !checks[0].error,
      packageManager: !checks[1].error,
      aiOrchestrator: !checks[2].error
    });

    const allHealthy = checks.every(c => !c.error);
    toast.success(allHealthy ? "✅ All systems operational" : "⚠️ Some systems need attention");
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">🚀 Mega Mind Dev Environment</h1>
            <p className="text-muted-foreground mt-1">
              Full-stack development with AI orchestration
            </p>
          </div>
          <Button onClick={checkSystemHealth} variant="outline">
            Check Health
          </Button>
        </div>

        {/* System Status */}
        <Card className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <Badge variant={systemStatus.terminal ? "default" : "destructive"}>
              <Terminal className="w-3 h-3 mr-1" />
              Terminal
            </Badge>
            <Badge variant={systemStatus.codeExecution ? "default" : "destructive"}>
              <Code className="w-3 h-3 mr-1" />
              Code Executor
            </Badge>
            <Badge variant={systemStatus.packageManager ? "default" : "destructive"}>
              <Package className="w-3 h-3 mr-1" />
              Package Manager
            </Badge>
            <Badge variant={systemStatus.aiOrchestrator ? "default" : "destructive"}>
              {systemStatus.aiOrchestrator ? (
                <CheckCircle className="w-3 h-3 mr-1" />
              ) : (
                <AlertCircle className="w-3 h-3 mr-1" />
              )}
              AI Orchestrator
            </Badge>
          </div>
        </Card>

        {/* Main Interface */}
        <Tabs defaultValue="generator" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="generator">
              <Code className="w-4 h-4 mr-2" />
              Component Generator
            </TabsTrigger>
            <TabsTrigger value="terminal">
              <Terminal className="w-4 h-4 mr-2" />
              Interactive Terminal
            </TabsTrigger>
            <TabsTrigger value="docs">
              <Package className="w-4 h-4 mr-2" />
              System Docs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generator" className="mt-6">
            <ReactGenerationHub />
          </TabsContent>

          <TabsContent value="terminal" className="mt-6">
            <Card className="p-6">
              <div className="mb-4">
                <h2 className="text-xl font-semibold mb-2">Enhanced Terminal</h2>
                <p className="text-sm text-muted-foreground">
                  Execute JavaScript, manage packages, and interact with the AI system
                </p>
              </div>
              <WebTerminal />
            </Card>
          </TabsContent>

          <TabsContent value="docs" className="mt-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">System Architecture</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">🎯 Core Functions</h3>
                  <ul className="space-y-2 text-sm">
                    <li>
                      <Badge variant="outline" className="mr-2">mega-mind-orchestrator</Badge>
                      AI-powered code generation & orchestration
                    </li>
                    <li>
                      <Badge variant="outline" className="mr-2">unified-code-operations</Badge>
                      React component generation with patterns
                    </li>
                    <li>
                      <Badge variant="outline" className="mr-2">code-executor</Badge>
                      Sandboxed JavaScript/TypeScript execution
                    </li>
                    <li>
                      <Badge variant="outline" className="mr-2">unified-package-manager</Badge>
                      Dependency detection & management
                    </li>
                    <li>
                      <Badge variant="outline" className="mr-2">unified-healing-engine</Badge>
                      Error detection & auto-fix
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-medium mb-2">✨ What Makes Us Different</h3>
                  <ul className="space-y-1 text-sm text-muted-foreground list-disc list-inside">
                    <li>No container overhead - instant execution</li>
                    <li>AI orchestration across all operations</li>
                    <li>Pattern learning from every generation</li>
                    <li>Intelligent error detection & fixes</li>
                    <li>Real-time preview with hot reload</li>
                    <li>Zero infrastructure cost per user</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-medium mb-2">🚀 Quick Commands</h3>
                  <div className="bg-muted p-4 rounded-md font-mono text-sm space-y-1">
                    <div>$ npm install - Detect dependencies</div>
                    <div>$ npm list - Show packages</div>
                    <div>$ console.log("test") - Execute JS</div>
                    <div>$ help - Show all commands</div>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
