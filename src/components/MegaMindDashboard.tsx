import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Brain, Package, Zap, CheckCircle2, AlertCircle, Code, Cpu, Database, Download } from "lucide-react";
import { CompleteProjectPackager } from "./CompleteProjectPackager";

export const MegaMindDashboard = () => {
  const [request, setRequest] = useState("");
  const [requestType, setRequestType] = useState<"code-generation" | "error-fix" | "deployment" | "enhancement">("code-generation");
  const [orchestration, setOrchestration] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleOrchestrate = async () => {
    if (!request.trim()) {
      toast.error("Please enter a request");
      return;
    }

    setIsProcessing(true);
    setOrchestration(null);

    try {
      const { data, error } = await supabase.functions.invoke('mega-mind-orchestrator', {
        body: {
          request,
          requestType,
          context: {
            appType: requestType === "code-generation" ? detectAppType(request) : "general"
          }
        }
      });

      if (error) throw error;

      setOrchestration(data);
      
      toast.success(data.message || "Orchestration completed!", {
        description: `${data.dependencies?.installed || 0} dependencies installed, ${data.generation?.files?.length || 0} files generated`
      });
    } catch (error: any) {
      console.error("Orchestration error:", error);
      toast.error("Orchestration failed", {
        description: error.message
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const detectAppType = (req: string): string => {
    const lower = req.toLowerCase();
    if (lower.includes('game') || lower.includes('phaser') || lower.includes('three.js')) return 'game';
    if (lower.includes('dashboard') || lower.includes('analytics')) return 'dashboard';
    if (lower.includes('website') || lower.includes('landing')) return 'website';
    return 'general';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Brain className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">🧠 Mega Mind System</h1>
          <p className="text-muted-foreground">
            Complete project generation with automatic dependency management
          </p>
        </div>
      </div>

      <Tabs defaultValue="orchestrator" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="orchestrator">Live Orchestrator</TabsTrigger>
          <TabsTrigger value="packager">
            <Download className="w-4 h-4 mr-2" />
            Project Packager
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orchestrator" className="space-y-4">
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Request Type</label>
                <div className="flex gap-2">
                  {(['code-generation', 'error-fix', 'deployment', 'enhancement'] as const).map((type) => (
                    <Button
                      key={type}
                      variant={requestType === type ? "default" : "outline"}
                      onClick={() => setRequestType(type)}
                      size="sm"
                    >
                      {type.replace('-', ' ')}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Your Request</label>
                <Textarea
                  placeholder="Example: Create a 2D platformer game with physics..."
                  value={request}
                  onChange={(e) => setRequest(e.target.value)}
                  rows={6}
                  className="font-mono text-sm"
                />
              </div>

              <Button 
                onClick={handleOrchestrate} 
                disabled={isProcessing}
                className="w-full"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Cpu className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Orchestrate with Mega Mind
                  </>
                )}
              </Button>
            </div>
          </Card>

          {orchestration && (
            <div className="space-y-4">
              {/* Analysis Phase */}
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Brain className="w-5 h-5 text-blue-500" />
                  <h3 className="text-lg font-semibold">Analysis Phase</h3>
                  <Badge variant="outline" className="ml-auto">Completed</Badge>
                </div>
                <div className="space-y-2 text-sm">
                  <p><strong>Main Goal:</strong> {orchestration.analysis?.mainGoal}</p>
                  <p><strong>Complexity:</strong> {orchestration.analysis?.complexity}</p>
                  <p><strong>Technologies:</strong> {orchestration.analysis?.requiredTechnologies?.join(', ')}</p>
                </div>
              </Card>

              {/* Dependencies Phase */}
              {orchestration.dependencies && (
                <Card className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Package className="w-5 h-5 text-green-500" />
                    <h3 className="text-lg font-semibold">Dependencies Phase</h3>
                    <Badge variant="outline" className="ml-auto">
                      {orchestration.dependencies.installed}/{orchestration.dependencies.detected} Installed
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {orchestration.dependencies.list.map((dep: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                        {dep.shouldInstall ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-yellow-500" />
                        )}
                        <code className="text-sm flex-1">{dep.name}</code>
                        <Badge variant="secondary" className="text-xs">{dep.category}</Badge>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Generation Phase */}
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Code className="w-5 h-5 text-purple-500" />
                  <h3 className="text-lg font-semibold">Generation Phase</h3>
                  <Badge variant="outline" className="ml-auto">
                    {orchestration.generation?.files?.length || 0} Files
                  </Badge>
                </div>
                {orchestration.generation?.files && (
                  <div className="space-y-2">
                    {orchestration.generation.files.slice(0, 5).map((file: any, idx: number) => (
                      <div key={idx} className="p-2 bg-muted/50 rounded">
                        <code className="text-sm">{file.path}</code>
                        <p className="text-xs text-muted-foreground mt-1">{file.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Verification Phase */}
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Database className="w-5 h-5 text-orange-500" />
                  <h3 className="text-lg font-semibold">Verification Phase</h3>
                  <Badge variant="outline" className="ml-auto">
                    {orchestration.verification?.readyForProduction ? "Production Ready" : "Needs Review"}
                  </Badge>
                </div>
                <div className="space-y-2 text-sm">
                  <p><strong>Code Quality:</strong> {orchestration.verification?.codeQuality}</p>
                  <div>
                    <strong>Recommendations:</strong>
                    <ul className="list-disc list-inside mt-1">
                      {orchestration.verification?.recommendations?.map((rec: string, idx: number) => (
                        <li key={idx} className="text-muted-foreground">{rec}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>

              {/* Orchestration ID */}
              <Card className="p-4 bg-muted/30">
                <p className="text-xs text-muted-foreground">
                  Orchestration ID: <code className="text-xs">{orchestration.orchestrationId}</code>
                </p>
              </Card>
            </div>
          )}

          {/* Capabilities Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <Card className="p-4">
              <Brain className="w-6 h-6 text-primary mb-2" />
              <h4 className="font-semibold mb-1">Intelligent Analysis</h4>
              <p className="text-sm text-muted-foreground">
                Understands ANY request type and determines optimal approach
              </p>
            </Card>
            <Card className="p-4">
              <Package className="w-6 h-6 text-green-500 mb-2" />
              <h4 className="font-semibold mb-1">Auto Dependencies</h4>
              <p className="text-sm text-muted-foreground">
                Detects & installs all packages including game engines
              </p>
            </Card>
            <Card className="p-4">
              <Zap className="w-6 h-6 text-yellow-500 mb-2" />
              <h4 className="font-semibold mb-1">Universal Error Fixing</h4>
              <p className="text-sm text-muted-foreground">
                Reads docs, learns patterns, fixes any deployment/runtime error
              </p>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="packager" className="space-y-4">
          <CompleteProjectPackager />
        </TabsContent>
      </Tabs>
    </div>
  );
};
