import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function TaskManagerOrchestration() {
  const { user } = useAuth();
  const [status, setStatus] = useState("Initializing...");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to continue",
        variant: "destructive"
      });
      return;
    }

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

        // Monitor progress
        if (data?.jobId) {
          const interval = setInterval(async () => {
            const { data: job } = await supabase
              .from('ai_generation_jobs')
              .select('status, progress, current_step')
              .eq('id', data.jobId)
              .single();

            if (job) {
              setStatus(job.current_step || "Processing...");
              setProgress(job.progress || 0);

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
  }, [user]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-8 space-y-6">
        <div className="text-center space-y-4">
          <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto" />
          <h1 className="text-3xl font-bold">Building Your Task Manager</h1>
          <p className="text-muted-foreground">{status}</p>
          
          <div className="space-y-2">
            <div className="w-full bg-secondary rounded-full h-4 overflow-hidden">
              <div 
                className="bg-primary h-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground">{progress}% complete</p>
          </div>

          <div className="text-left space-y-2 mt-8 text-sm text-muted-foreground">
            <p>⚡ Setting up database tables</p>
            <p>🔐 Configuring authentication & RLS</p>
            <p>🤖 Integrating AI features</p>
            <p>🎨 Building beautiful UI components</p>
            <p>📡 Enabling real-time updates</p>
          </div>

          <p className="text-xs text-muted-foreground mt-4">
            This typically takes 8-13 minutes. You can close this window - the process will continue in the background.
          </p>
        </div>
      </Card>
    </div>
  );
}
