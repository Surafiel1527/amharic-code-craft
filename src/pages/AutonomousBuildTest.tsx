import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Sparkles, ArrowRight, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { useRealtimeOrchestration } from '@/hooks/useRealtimeOrchestration';

export default function AutonomousBuildTest() {
  const navigate = useNavigate();
  const [request, setRequest] = useState('Build a complete Task Manager app with:\n- User authentication\n- Create, read, update, delete tasks\n- Task priorities (low, medium, high, urgent)\n- Task status (todo, in progress, done)\n- Comments on tasks\n- Real-time updates\n- Beautiful UI with stats dashboard');
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);

  const { jobData } = useRealtimeOrchestration({
    jobId,
    onComplete: (data) => {
      toast.success('Build completed! Check the generated files.');
      setIsGenerating(false);
    },
    onError: (error) => {
      toast.error('Build failed: ' + error);
      setIsGenerating(false);
    }
  });

  const startAutonomousBuild = async () => {
    try {
      setIsGenerating(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create AI generation job
      const { data: job, error: jobError } = await supabase
        .from('ai_generation_jobs')
        .insert({
          user_id: user.id,
          job_type: 'full_app_generation',
          input_data: {
            request,
            requirements: {
              features: [
                'authentication',
                'database_crud',
                'real_time_updates',
                'comments',
                'filtering',
                'stats'
              ],
              complexity: 'medium'
            }
          },
          status: 'queued'
        })
        .select()
        .single();

      if (jobError) throw jobError;
      
      setJobId(job.id);
      toast.success('Build request submitted to AI orchestration system!');

      // Invoke mega-mind orchestrator
      const { error: funcError } = await supabase.functions.invoke('mega-mind-orchestrator', {
        body: {
          jobId: job.id,
          request,
          userId: user.id
        }
      });

      if (funcError) {
        console.error('Orchestrator error:', funcError);
        toast.error('Failed to start orchestrator');
        setIsGenerating(false);
      }
    } catch (error: any) {
      toast.error('Failed to start build: ' + error.message);
      setIsGenerating(false);
    }
  };

  const getStatusIcon = () => {
    if (!jobData) return <Loader2 className="h-5 w-5 animate-spin" />;
    
    switch (jobData.status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Loader2 className="h-5 w-5 animate-spin" />;
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Autonomous Build Test</h1>
          <p className="text-muted-foreground">
            Test if the platform can autonomously build a complete app
          </p>
        </div>

        {/* Test Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Phase 3: AI Orchestration Test
            </CardTitle>
            <CardDescription>
              This tests the platform's ability to autonomously generate a complete application using:
              Architecture Planning → Code Generation → Database Setup → Real-time Features
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Build Request */}
        <Card>
          <CardHeader>
            <CardTitle>Build Request</CardTitle>
            <CardDescription>
              Describe what you want the AI to build (or use the default Task Manager example)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              rows={12}
              className="font-mono text-sm"
              disabled={isGenerating}
            />
            
            <Button 
              onClick={startAutonomousBuild} 
              disabled={isGenerating || !request.trim()}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Building Autonomously...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Start Autonomous Build
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Real-time Progress */}
        {jobData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon()}
                Build Progress
              </CardTitle>
              <CardDescription>
                Status: {jobData.status} | Progress: {jobData.progress}%
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Progress Bar */}
              <div className="w-full bg-secondary rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${jobData.progress}%` }}
                />
              </div>

              {/* Current Step */}
              {jobData.current_step && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">Current Step:</p>
                  <p className="text-sm text-muted-foreground">{jobData.current_step}</p>
                </div>
              )}

              {/* Phases */}
              {jobData.phases && jobData.phases.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Phases:</p>
                  {jobData.phases.map((phase: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      {phase.completed ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      <span className={phase.completed ? 'text-muted-foreground' : ''}>
                        {phase.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Stream Updates */}
              {jobData.stream_updates && jobData.stream_updates.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Live Updates:</p>
                  <div className="max-h-48 overflow-y-auto space-y-1 p-3 bg-muted rounded-lg font-mono text-xs">
                    {jobData.stream_updates.map((update: string, idx: number) => (
                      <div key={idx} className="text-muted-foreground">
                        {update}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error Message */}
              {jobData.error_message && (
                <div className="p-3 bg-destructive/10 border border-destructive rounded-lg">
                  <p className="text-sm font-medium text-destructive">Error:</p>
                  <p className="text-sm text-destructive/80">{jobData.error_message}</p>
                </div>
              )}

              {/* Completion */}
              {jobData.status === 'completed' && (
                <div className="flex gap-2">
                  <Button onClick={() => navigate('/tasks')} className="flex-1">
                    <ArrowRight className="mr-2 h-4 w-4" />
                    View Generated App
                  </Button>
                  <Button onClick={() => navigate('/test-dashboard')} variant="outline">
                    Back to Tests
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* What This Tests */}
        <Card>
          <CardHeader>
            <CardTitle>What This Tests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500" />
              <div>
                <strong>Architecture Planning:</strong> Can the AI create a proper architecture plan?
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500" />
              <div>
                <strong>Database Schema:</strong> Automatic table creation, RLS policies, real-time setup
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500" />
              <div>
                <strong>Code Generation:</strong> Components, pages, hooks, business logic
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500" />
              <div>
                <strong>Multi-step Orchestration:</strong> Complex workflow coordination
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500" />
              <div>
                <strong>Real-time Progress:</strong> Live updates during generation
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}