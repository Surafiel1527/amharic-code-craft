import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Brain, 
  TrendingUp, 
  Zap, 
  Target, 
  Workflow,
  Lightbulb,
  BarChart3,
  Activity,
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

export const EnterpriseProjectDashboard = () => {
  const [orchestratorTask, setOrchestratorTask] = useState("");
  const [orchestratorResult, setOrchestratorResult] = useState<any>(null);
  const [isOrchestrating, setIsOrchestrating] = useState(false);
  
  const [proactiveMode, setProactiveMode] = useState("suggestions");
  const [proactiveSuggestions, setProactiveSuggestions] = useState<any[]>([]);
  const [isLoadingProactive, setIsLoadingProactive] = useState(false);
  
  const { toast } = useToast();

  const runSmartOrchestrator = async () => {
    if (!orchestratorTask.trim()) {
      toast({
        title: "Task Required",
        description: "Please describe the task to orchestrate",
        variant: "destructive"
      });
      return;
    }

    setIsOrchestrating(true);
    try {
      const { data, error } = await supabase.functions.invoke('smart-orchestrator', {
        body: { 
          task: orchestratorTask,
          context: { timestamp: new Date().toISOString() }
        }
      });

      if (error) throw error;

      setOrchestratorResult(data);
      toast({
        title: "✅ Orchestration Complete!",
        description: `Completed ${data.total_steps} steps successfully`
      });
    } catch (error: any) {
      console.error('Orchestration error:', error);
      toast({
        title: "Orchestration Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsOrchestrating(false);
    }
  };

  const getProactiveIntelligence = async () => {
    setIsLoadingProactive(true);
    try {
      const { data, error } = await supabase.functions.invoke('proactive-intelligence', {
        body: { mode: proactiveMode }
      });

      if (error) throw error;

      setProactiveSuggestions(data.suggestions);
      toast({
        title: "🧠 Intelligence Generated",
        description: `${data.suggestions.length} proactive suggestions ready`
      });
    } catch (error: any) {
      console.error('Proactive intelligence error:', error);
      toast({
        title: "Failed to Generate Intelligence",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoadingProactive(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
          <Brain className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Enterprise Intelligence</h2>
          <p className="text-muted-foreground">Advanced AI orchestration & proactive insights</p>
        </div>
      </div>

      <Tabs defaultValue="orchestrator" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="orchestrator" className="flex items-center gap-2">
            <Workflow className="h-4 w-4" />
            Smart Orchestrator
          </TabsTrigger>
          <TabsTrigger value="proactive" className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Proactive AI
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orchestrator" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Workflow className="h-5 w-5" />
                Multi-Step AI Orchestrator
              </CardTitle>
              <CardDescription>
                Describe a complex task and AI will break it down and execute it step-by-step
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Textarea
                  placeholder="E.g., 'Create a REST API with authentication, add unit tests, deploy to production, and generate documentation'"
                  value={orchestratorTask}
                  onChange={(e) => setOrchestratorTask(e.target.value)}
                  rows={4}
                />
                <Button 
                  onClick={runSmartOrchestrator}
                  disabled={isOrchestrating}
                  className="w-full"
                >
                  {isOrchestrating ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Orchestrating...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Orchestrate Task
                    </>
                  )}
                </Button>
              </div>

              {orchestratorResult && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                          <div className="text-2xl font-bold">{orchestratorResult.total_steps}</div>
                          <div className="text-sm text-muted-foreground">Steps Completed</div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <Activity className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                          <div className="text-2xl font-bold">{orchestratorResult.success_rate}%</div>
                          <div className="text-sm text-muted-foreground">Success Rate</div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <Clock className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                          <div className="text-2xl font-bold">{Math.floor(orchestratorResult.total_time / 60)}m</div>
                          <div className="text-sm text-muted-foreground">Total Time</div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Execution Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[200px]">
                        <div className="space-y-3">
                          {orchestratorResult.results?.map((result: any, idx: number) => (
                            <div key={idx} className="border rounded-lg p-3">
                              <div className="flex items-start justify-between mb-2">
                                <Badge variant="outline">Step {result.step_number}</Badge>
                                <Badge>{result.action_type}</Badge>
                              </div>
                              <p className="font-medium mb-1">{result.description}</p>
                              <p className="text-sm text-muted-foreground line-clamp-2">{result.output}</p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>AI Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{orchestratorResult.summary}</p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="proactive" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Proactive AI Suggestions
              </CardTitle>
              <CardDescription>
                AI analyzes your patterns and proactively suggests optimizations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button 
                  onClick={getProactiveIntelligence}
                  disabled={isLoadingProactive}
                  className="flex-1"
                >
                  {isLoadingProactive ? (
                    <>
                      <Brain className="h-4 w-4 mr-2 animate-pulse" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Generate Intelligence
                    </>
                  )}
                </Button>
              </div>

              {proactiveSuggestions.length > 0 && (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {proactiveSuggestions.map((suggestion: any, idx: number) => (
                      <Card key={idx}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <Target className="h-5 w-5 text-primary" />
                              <CardTitle className="text-lg">{suggestion.title}</CardTitle>
                            </div>
                            <Badge variant={getPriorityColor(suggestion.priority)}>
                              {suggestion.priority}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="text-sm">{suggestion.description}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <BarChart3 className="h-4 w-4" />
                              Impact: {suggestion.estimated_impact}
                            </div>
                            <Badge variant="outline">{suggestion.action_type}</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}

              {proactiveSuggestions.length === 0 && (
                <Card className="border-dashed">
                  <CardContent className="pt-6 text-center">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Click "Generate Intelligence" to get AI-powered suggestions based on your activity
                    </p>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
