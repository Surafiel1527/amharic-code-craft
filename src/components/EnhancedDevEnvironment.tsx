import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Terminal, Code, Package, AlertCircle, CheckCircle, Zap, BookOpen, Rocket } from "lucide-react";
import { WebTerminal } from "./WebTerminal";
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
  const [isChecking, setIsChecking] = useState(false);

  // Auto-check health on mount
  useEffect(() => {
    const timer = setTimeout(() => checkSystemHealth(), 1000);
    return () => clearTimeout(timer);
  }, []);

  const checkSystemHealth = async () => {
    setIsChecking(true);
    toast.info("🔍 Running health diagnostics...");
    
    try {
      const checks = await Promise.all([
        supabase.functions.invoke('unified-code-operations', { body: { operation: 'execute', params: { code: 'return "OK"', language: 'javascript' } } }),
        supabase.functions.invoke('unified-package-manager', { body: { operation: 'auto_detect' } }),
        supabase.functions.invoke('mega-mind-orchestrator', { body: { request: 'health check', requestType: 'system' } })
      ]);

      setSystemStatus({
        terminal: true,
        codeExecution: !checks[0].error,
        packageManager: !checks[1].error,
        aiOrchestrator: !checks[2].error
      });

      const activeCount = Object.values({
        terminal: true,
        codeExecution: !checks[0].error,
        packageManager: !checks[1].error,
        aiOrchestrator: !checks[2].error
      }).filter(Boolean).length;

      toast.success(
        activeCount === 4 
          ? "✅ All systems operational!" 
          : `⚠️ ${activeCount}/4 systems active`,
        { duration: 3000 }
      );
    } catch (error) {
      toast.error("❌ Health check failed");
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-lg shadow-lg animate-scale-in">
                <Rocket className="h-5 w-5 text-white" />
              </div>
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Mega Mind Dev Environment
              </span>
            </h2>
            <p className="text-muted-foreground">
              🚀 Full-stack development • ⚡ Real-time execution • 🤖 AI orchestration
            </p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                onClick={checkSystemHealth} 
                variant="outline" 
                className="gap-2 hover-scale"
                disabled={isChecking}
              >
                {isChecking ? (
                  <>
                    <Zap className="h-4 w-4 animate-pulse" />
                    Checking...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Health Check
                  </>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Run diagnostics on all systems</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* System Status */}
        <Card className="p-4 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 dark:from-blue-950/20 dark:via-purple-950/20 dark:to-pink-950/20 border-2 animate-scale-in">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-semibold">System Status:</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant={systemStatus.terminal ? "default" : "destructive"} className="gap-1 hover-scale cursor-help">
                    <Terminal className="w-3 h-3" />
                    Terminal
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>Interactive command execution</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger>
                  <Badge variant={systemStatus.codeExecution ? "default" : "destructive"} className="gap-1 hover-scale cursor-help">
                    <Code className="w-3 h-3" />
                    Code Executor
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>Sandboxed JS/TS execution via unified-code-operations</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger>
                  <Badge variant={systemStatus.packageManager ? "default" : "destructive"} className="gap-1 hover-scale cursor-help">
                    <Package className="w-3 h-3" />
                    Package Manager
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>Smart dependency detection via unified-package-manager</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger>
                  <Badge variant={systemStatus.aiOrchestrator ? "default" : "destructive"} className="gap-1 hover-scale cursor-help">
                    {systemStatus.aiOrchestrator ? (
                      <CheckCircle className="w-3 h-3" />
                    ) : (
                      <AlertCircle className="w-3 h-3" />
                    )}
                    AI Orchestrator
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>Intelligent code generation via mega-mind-orchestrator</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <div className="ml-auto">
              <Badge variant="outline" className="gap-1 font-semibold">
                <Zap className="w-3 h-3 text-yellow-500" />
                {Object.values(systemStatus).filter(Boolean).length}/{Object.keys(systemStatus).length} Active
              </Badge>
            </div>
          </div>
        </Card>

        {/* Main Interface */}
        <Tabs defaultValue="terminal" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-12">
            <TabsTrigger value="terminal" className="gap-2 hover-scale">
              <Terminal className="w-4 h-4" />
              <span className="hidden sm:inline">Interactive Terminal</span>
              <span className="sm:hidden">Terminal</span>
            </TabsTrigger>
            <TabsTrigger value="docs" className="gap-2 hover-scale">
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Documentation</span>
              <span className="sm:hidden">Docs</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="terminal" className="mt-6 animate-fade-in">
            <Card className="p-6 border-2">
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
                    <Terminal className="h-5 w-5 text-primary" />
                    Enhanced Terminal
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    ⚡ Execute JS/TS • 📦 Manage packages • 🤖 AI integration
                  </p>
                </div>
                <Badge variant="secondary" className="gap-1">
                  <Zap className="h-3 w-3" />
                  Real-time
                </Badge>
              </div>
              <WebTerminal />
            </Card>
          </TabsContent>

          <TabsContent value="docs" className="mt-6 animate-fade-in">
            <Card className="p-6 border-2">
              <div className="flex items-center gap-2 mb-6">
                <BookOpen className="h-6 w-6 text-primary" />
                <h2 className="text-xl font-semibold">System Architecture & Capabilities</h2>
              </div>
              <div className="space-y-6">
                <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Rocket className="h-4 w-4 text-primary" />
                    Core Edge Functions
                  </h3>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-start gap-2 hover-scale">
                      <Badge variant="outline" className="mt-0.5">mega-mind-orchestrator</Badge>
                      <span className="text-muted-foreground">AI-powered code generation & intelligent orchestration</span>
                    </li>
                    <li className="flex items-start gap-2 hover-scale">
                      <Badge variant="outline" className="mt-0.5">unified-code-operations</Badge>
                      <span className="text-muted-foreground">React component generation with learned patterns</span>
                    </li>
                    <li className="flex items-start gap-2 hover-scale">
                      <Badge variant="outline" className="mt-0.5">unified-code-operations</Badge>
                      <span className="text-muted-foreground">Secure JavaScript/TypeScript execution in Deno sandbox</span>
                    </li>
                    <li className="flex items-start gap-2 hover-scale">
                      <Badge variant="outline" className="mt-0.5">unified-package-manager</Badge>
                      <span className="text-muted-foreground">Smart dependency detection & management</span>
                    </li>
                    <li className="flex items-start gap-2 hover-scale">
                      <Badge variant="outline" className="mt-0.5">unified-healing-engine</Badge>
                      <span className="text-muted-foreground">Automatic error detection & intelligent fixes</span>
                    </li>
                  </ul>
                </div>

                <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-lg">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-green-600" />
                    Competitive Advantages
                  </h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span>⚡ Instant execution (no container spin-up)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span>🤖 AI orchestration across all operations</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span>🧠 Pattern learning from every generation</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span>🔧 Intelligent error detection & auto-fix</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span>🔥 Real-time preview with hot reload support</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span>💰 Zero infrastructure cost per user</span>
                    </li>
                  </ul>
                </div>

                <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-lg">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-purple-600" />
                    Quick Terminal Commands
                  </h3>
                  <div className="bg-black/90 p-4 rounded-md font-mono text-sm space-y-2 text-green-400">
                    <div className="flex items-center gap-2">
                      <span className="text-blue-400">$</span> npm install
                      <span className="text-gray-400 text-xs ml-auto">→ Auto-detect dependencies</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-blue-400">$</span> npm list
                      <span className="text-gray-400 text-xs ml-auto">→ Show installed packages</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-blue-400">$</span> console.log("Hello")
                      <span className="text-gray-400 text-xs ml-auto">→ Execute JavaScript</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-blue-400">$</span> help
                      <span className="text-gray-400 text-xs ml-auto">→ Show all commands</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
