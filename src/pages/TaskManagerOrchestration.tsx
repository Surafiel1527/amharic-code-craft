import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Loader2, Code, Eye } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

export default function TaskManagerOrchestration() {
  const { user } = useAuth();
  const [status, setStatus] = useState("Initializing...");
  const [progress, setProgress] = useState(0);
  const [generatedCode, setGeneratedCode] = useState("");
  const [activeTab, setActiveTab] = useState("progress");
  const [jobId, setJobId] = useState<string | null>(null);
  const [isCancelled, setIsCancelled] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    if (!user || hasStarted) {
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to continue",
          variant: "destructive"
        });
      }
      return;
    }

    setHasStarted(true);
    const startOrchestration = async () => {
      try {
        setStatus("🚀 Starting orchestration...");
        
        const { data, error } = await supabase.functions.invoke("smart-orchestrator", {
          body: {
            task: `Build a complete AI-powered task manager with the following features:

DATABASE & AUTH:
- User authentication (signup/login with email/password)
- Tasks table with: title, description, priority (low/medium/high), status (todo/in-progress/done), due_date, category, tags, created_at
- User profiles with username and avatar
- Task comments/notes for collaboration
- Full RLS security policies

AI FEATURES:
- Smart task suggestions based on user's task history
- Auto-categorization of tasks when user types naturally (e.g., "buy groceries" → auto-tagged as "shopping")
- AI chat interface where users can say "add task to buy milk tomorrow" and it creates the task automatically
- Priority recommendations based on urgency keywords

UI COMPONENTS:
- Modern dashboard with:
  * Task statistics (completed, pending, overdue)
  * Quick add task form
  * Task list with filtering (by status, priority, category)
  * Drag-and-drop to change task status
  * Search and sort functionality
- AI chat panel (floating button bottom-right)
- Clean, professional design with smooth animations

REAL-TIME:
- Live task updates when tasks are added/completed
- Real-time task count updates in dashboard

Make it production-ready with proper error handling, loading states, and mobile responsive design`,
            userId: user.id,
            context: {
              requestType: 'full-stack-generation',
              timestamp: new Date().toISOString()
            }
          }
        });

        if (error) {
          throw error;
        }

        toast({
          title: "Orchestration Started!",
          description: "Building your task manager in the background. Job ID: " + data?.jobId,
        });

        // Monitor progress and fetch generated code
        if (data?.jobId) {
          setJobId(data.jobId);
          const interval = setInterval(async () => {
            if (isCancelled) {
              clearInterval(interval);
              return;
            }
            const { data: job } = await supabase
              .from('ai_generation_jobs')
              .select('status, progress, current_step, output_data')
              .eq('id', data.jobId)
              .single();

            if (job) {
              setStatus(job.current_step || "Processing...");
              setProgress(job.progress || 0);

              // Update generated code if available
              if (job.output_data) {
                const outputData = job.output_data as any;
                if (outputData.generatedCode) {
                  setGeneratedCode(outputData.generatedCode);
                } else if (outputData.html) {
                  setGeneratedCode(outputData.html);
                }
              }

              if (job.status === 'completed') {
                clearInterval(interval);
                toast({
                  title: "✅ Complete!",
                  description: "Your task manager is ready!",
                });
                setTimeout(() => {
                  window.location.href = '/';
                }, 2000);
              } else if (job.status === 'failed' || job.status === 'cancelled') {
                clearInterval(interval);
                toast({
                  title: "Orchestration " + job.status,
                  description: "Please try again",
                  variant: "destructive"
                });
              }
            }
          }, 2000);
        }

      } catch (error) {
        console.error('Orchestration error:', error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to start orchestration",
          variant: "destructive"
        });
      }
    };

    startOrchestration();
  }, [user, hasStarted]);

  const handleCancel = async () => {
    if (!jobId) return;
    
    setIsCancelled(true);
    try {
      await supabase
        .from('ai_generation_jobs')
        .update({ status: 'cancelled' })
        .eq('id', jobId);
      
      toast({
        title: "Cancelled",
        description: "Orchestration has been cancelled",
      });
      
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    } catch (error) {
      console.error('Cancel error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4">
      <div className="container mx-auto max-w-7xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold">Building Your Task Manager</h1>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCancel}
                disabled={isCancelled || progress >= 100}
              >
                {isCancelled ? "Cancelling..." : "Cancel"}
              </Button>
            </div>
            <TabsList>
              <TabsTrigger value="progress">
                <Loader2 className="h-4 w-4 mr-2" />
                Progress
              </TabsTrigger>
              <TabsTrigger value="preview" disabled={!generatedCode}>
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="code" disabled={!generatedCode}>
                <Code className="h-4 w-4 mr-2" />
                Code
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="progress" className="mt-0">
            <Card className="p-8 space-y-6">
              <div className="text-center space-y-4">
                <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto" />
                <p className="text-lg text-muted-foreground">{status}</p>
                
                <div className="space-y-2">
                  <div className="w-full bg-secondary rounded-full h-4 overflow-hidden">
                    <div 
                      className="bg-primary h-full transition-all duration-500 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">{progress}% complete</p>
                </div>

                <div className="text-left space-y-2 mt-8 text-sm text-muted-foreground max-w-md mx-auto">
                  <p>⚡ Setting up database tables</p>
                  <p>🔐 Configuring authentication & RLS</p>
                  <p>🤖 Integrating AI features</p>
                  <p>🎨 Building beautiful UI components</p>
                  <p>📡 Enabling real-time updates</p>
                </div>

                <p className="text-xs text-muted-foreground mt-4">
                  This typically takes 8-13 minutes. You can switch to Preview or Code tabs to see the output as it's generated.
                </p>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="preview" className="mt-0">
            <Card className="p-4">
              {generatedCode ? (
                <div className="w-full h-[calc(100vh-200px)] bg-white rounded-lg overflow-hidden">
                  <iframe
                    srcDoc={generatedCode}
                    className="w-full h-full border-0"
                    title="Live Preview"
                    sandbox="allow-scripts allow-same-origin"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-96 text-muted-foreground">
                  <div className="text-center space-y-2">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                    <p>Waiting for code generation...</p>
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="code" className="mt-0">
            <Card className="p-4">
              {generatedCode ? (
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute top-2 right-2 z-10"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedCode);
                      toast({
                        title: "Copied!",
                        description: "Code copied to clipboard",
                      });
                    }}
                  >
                    <Code className="h-4 w-4 mr-2" />
                    Copy Code
                  </Button>
                  <pre className="bg-secondary p-4 rounded-lg overflow-auto max-h-[calc(100vh-200px)] text-xs">
                    <code>{generatedCode}</code>
                  </pre>
                </div>
              ) : (
                <div className="flex items-center justify-center h-96 text-muted-foreground">
                  <div className="text-center space-y-2">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                    <p>Waiting for code generation...</p>
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
