import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Loader2, Code, Eye } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { pollJobProgress, loadProgress, saveProgress, formatErrorMessage } from "@/utils/orchestrationHelpers";

export default function TaskManagerOrchestration() {
  const { user } = useAuth();
  const [status, setStatus] = useState("Initializing...");
  const [progress, setProgress] = useState(0);
  const [generatedCode, setGeneratedCode] = useState("");
  const [activeTab, setActiveTab] = useState("progress");
  const [jobId, setJobId] = useState<string | null>(null);
  const [isCancelled, setIsCancelled] = useState(false);
  const isStartingRef = useRef(false);

  useEffect(() => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to continue",
        variant: "destructive"
      });
      return;
    }

    // Prevent multiple simultaneous starts using ref (survives re-renders)
    if (isStartingRef.current) {
      console.log('❌ Already starting, skipping...');
      return;
    }

    const startOrchestration = async () => {
      // Set lock immediately before any async operations
      isStartingRef.current = true;
      console.log('🔒 Lock acquired, starting orchestration...');
      
      try {
        // Try to load previous progress first
        const savedProgress = await loadProgress(user.id);
        if (savedProgress && savedProgress.status !== 'completed' && savedProgress.status !== 'failed') {
          console.log('✅ Resuming previous job:', savedProgress.jobId);
          setJobId(savedProgress.jobId);
          setStatus(savedProgress.currentStep);
          setProgress(savedProgress.progress);
          
          toast({
            title: "Resuming Work",
            description: "Found previous orchestration, resuming...",
          });
          
          // Use the polling helper
          await pollJobProgress(savedProgress.jobId, (progressData) => {
            setStatus(progressData.currentStep);
            setProgress(progressData.progress);
            
            if (progressData.outputData?.generatedCode || progressData.outputData?.html) {
              setGeneratedCode(progressData.outputData.generatedCode || progressData.outputData.html);
            }
          }, {
            interval: 2000,
            timeout: 600000, // 10 minutes
            onComplete: (outputData) => {
              toast({
                title: "✅ Complete!",
                description: "Your task manager is ready!",
              });
              setTimeout(() => window.location.href = '/', 2000);
            },
            onError: (error) => {
              toast({
                title: "Error",
                description: formatErrorMessage(error),
                variant: "destructive"
              });
            }
          });
          
          return;
        }

        console.log('🚀 No existing jobs, creating new orchestration...');
        setStatus("🚀 Starting orchestration...");
        
        const { data, error } = await supabase.functions.invoke("mega-mind-orchestrator", {
          body: {
            request: `Build a complete AI-powered task manager with the following features:

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
            requestType: 'full-stack-generation',
            context: {
              userId: user.id,
              timestamp: new Date().toISOString()
            }
          }
        });

        if (error) {
          console.error('❌ Failed to start orchestration:', error);
          throw error;
        }

        if (!data?.jobId) {
          throw new Error("No job ID returned from orchestrator");
        }

        // Save progress
        await saveProgress(user.id, {
          currentRequest: 'Task Manager Generation',
          jobId: data.jobId,
          progress: 0,
          currentStep: 'Starting orchestration...'
        });

        toast({
          title: "Orchestration Started!",
          description: "Building your task manager. Job ID: " + data.jobId,
        });

        setJobId(data.jobId);
        
        // Use polling helper for progress tracking
        await pollJobProgress(data.jobId, (progressData) => {
          setStatus(progressData.currentStep);
          setProgress(progressData.progress);
          
          // Save progress for persistence
          saveProgress(user.id, {
            jobId: data.jobId,
            progress: progressData.progress,
            currentStep: progressData.currentStep
          });

          if (progressData.outputData?.generatedCode || progressData.outputData?.html) {
            setGeneratedCode(progressData.outputData.generatedCode || progressData.outputData.html);
          }
        }, {
          interval: 2000,
          timeout: 600000, // 10 minutes
          onComplete: (outputData) => {
            toast({
              title: "✅ Complete!",
              description: "Your task manager is ready!",
            });
            setTimeout(() => window.location.href = '/', 2000);
          },
          onError: (error) => {
            toast({
              title: "Orchestration Failed",
              description: formatErrorMessage(error),
              variant: "destructive"
            });
          }
        });

      } catch (error) {
        console.error('❌ Orchestration error:', error);
        isStartingRef.current = false; // Release lock on error
        
        const errorMsg = formatErrorMessage(error);
        toast({
          title: "Error",
          description: errorMsg,
          variant: "destructive"
        });
      }
    };

    startOrchestration();
  }, [user]);

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
