import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Loader2, Code, Eye } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useRealtimeOrchestration } from "@/hooks/useRealtimeOrchestration";
import { loadProgress, saveProgress, formatErrorMessage } from "@/utils/orchestrationHelpers";
import { OrchestrationProgress } from "@/components/OrchestrationProgress";

export default function TaskManagerOrchestration() {
  const { user } = useAuth();
  const [status, setStatus] = useState("Initializing...");
  const [progress, setProgress] = useState(0);
  const [generatedCode, setGeneratedCode] = useState("");
  const [activeTab, setActiveTab] = useState("progress");
  const [jobId, setJobId] = useState<string | null>(null);
  const [phases, setPhases] = useState<any[]>([]);
  const isStartingRef = useRef(false);

  // Real-time progress tracking with automatic fallback
  const { jobData } = useRealtimeOrchestration({
    jobId,
    onProgress: (update) => {
      setStatus(update.current_step);
      setProgress(update.progress);
      setPhases(update.phases || []);
      
      if (update.output_data?.generatedCode || update.output_data?.html) {
        setGeneratedCode(update.output_data.generatedCode || update.output_data.html);
      }

      if (user) {
        saveProgress(user.id, {
          jobId: update.id,
          progress: update.progress,
          currentStep: update.current_step
        });
      }
    },
    onComplete: (data) => {
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
    },
    enablePollingFallback: true
  });

  useEffect(() => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to continue",
        variant: "destructive"
      });
      return;
    }

    if (isStartingRef.current) {
      console.log('❌ Already starting, skipping...');
      return;
    }

    const startOrchestration = async () => {
      isStartingRef.current = true;
      console.log('🔒 Starting orchestration...');
      
      try {
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
          return;
        }

        console.log('🚀 Creating new orchestration...');
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

        if (error) throw error;
        if (!data?.jobId) throw new Error("No job ID returned");

        await saveProgress(user.id, {
          currentRequest: 'Task Manager Generation',
          jobId: data.jobId,
          progress: 0,
          currentStep: 'Starting orchestration...'
        });

        toast({
          title: "Orchestration Started!",
          description: "Building your task manager",
        });

        setJobId(data.jobId);
      } catch (error) {
        console.error('❌ Orchestration error:', error);
        toast({
          title: "Error",
          description: formatErrorMessage(error),
          variant: "destructive"
        });
      } finally {
        isStartingRef.current = false;
      }
    };

    startOrchestration();
  }, [user]);

  const handleCancel = async () => {
    if (!jobId) return;
    
    try {
      await supabase
        .from('ai_generation_jobs')
        .update({ status: 'cancelled' })
        .eq('id', jobId);
      
      toast({
        title: "Cancelled",
        description: "Orchestration has been cancelled",
      });
      
      setTimeout(() => window.location.href = '/', 1500);
    } catch (error) {
      console.error('Cancel error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4">
      <div className="container mx-auto max-w-7xl">
        {phases.length > 0 && (
          <div className="mb-4">
            <OrchestrationProgress
              phases={phases}
              isLoading={progress < 100}
              jobId={jobId}
              onCancel={handleCancel}
              currentProgress={progress}
            />
          </div>
        )}
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Building Your Task Manager</h1>
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
                  <p className="text-sm font-mono text-muted-foreground">
                    {Math.round(progress)}% Complete
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="preview" className="mt-0">
            <Card className="p-4">
              <div className="bg-white rounded-lg border-2 border-border overflow-hidden">
                <iframe
                  srcDoc={generatedCode}
                  className="w-full h-[600px]"
                  title="Generated Task Manager Preview"
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="code" className="mt-0">
            <Card className="p-4">
              <pre className="bg-secondary p-4 rounded-lg overflow-x-auto">
                <code className="text-sm">{generatedCode}</code>
              </pre>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
