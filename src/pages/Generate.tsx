import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Sparkles, Loader2, CheckCircle2, Code, Database, FileCode } from 'lucide-react';
import { useRealtimeOrchestration } from '@/hooks/useRealtimeOrchestration';

export default function Generate() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [generatedFiles, setGeneratedFiles] = useState<any[]>([]);

  const { jobData } = useRealtimeOrchestration({
    jobId,
    onProgress: (update) => {
      console.log('Progress update:', update);
    },
    onComplete: (data) => {
      toast.success('Generation completed!');
      setIsGenerating(false);
      if (data?.generated_files) {
        setGeneratedFiles(data.generated_files);
      }
    },
    onError: (error) => {
      toast.error('Generation failed: ' + error);
      setIsGenerating(false);
    }
  });

  const startGeneration = async () => {
    if (!prompt.trim()) {
      toast.error('Please describe what you want to build');
      return;
    }

    try {
      setIsGenerating(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Please sign in to generate');
        navigate('/auth');
        return;
      }

      // Create job
      const { data: job, error: jobError } = await supabase
        .from('ai_generation_jobs')
        .insert({
          user_id: user.id,
          job_type: 'code_generation',
          input_data: { prompt },
          status: 'queued'
        })
        .select()
        .single();

      if (jobError) throw jobError;
      
      setJobId(job.id);
      toast.success('Starting AI generation...');

      // Call generation function
      const { error: funcError } = await supabase.functions.invoke('ai-code-generator', {
        body: { 
          prompt, 
          userId: user.id,
          jobId: job.id 
        }
      });

      if (funcError) {
        console.error('Generation function error:', funcError);
        throw funcError;
      }

    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error('Failed to start generation: ' + error.message);
      setIsGenerating(false);
    }
  };

  const downloadFile = (file: any) => {
    const blob = new Blob([file.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.path.split('/').pop() || 'generated-file.tsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('File downloaded!');
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold flex items-center justify-center gap-3">
            <Sparkles className="h-10 w-10" />
            AI Code Generator
          </h1>
          <p className="text-muted-foreground">
            Describe what you want to build and AI will generate it for you
          </p>
        </div>

        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle>What do you want to build?</CardTitle>
            <CardDescription>
              Describe your application in detail. The AI will create components, database schemas, and full implementations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Example: Build a todo list app with user authentication, task priorities, due dates, and the ability to mark tasks as complete. Include a dashboard showing statistics."
              rows={8}
              disabled={isGenerating}
              className="resize-none"
            />
            
            <Button 
              onClick={startGeneration} 
              disabled={isGenerating || !prompt.trim()}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Generate with AI
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Progress Section */}
        {jobData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {jobData.status === 'completed' ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <Loader2 className="h-5 w-5 animate-spin" />
                )}
                Generation Progress
              </CardTitle>
              <CardDescription>
                {jobData.current_step}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span className="font-medium">{jobData.progress}%</span>
                </div>
                <Progress value={jobData.progress} className="h-2" />
              </div>

              {/* Phases */}
              {jobData.phases && jobData.phases.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {jobData.phases.map((phase: any, idx: number) => (
                    <Card key={idx} className={phase.completed ? 'bg-muted' : ''}>
                      <CardContent className="pt-4 flex items-center gap-2">
                        {phase.completed ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                        <span className="text-sm">{phase.name}</span>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Output Summary */}
              {jobData.status === 'completed' && jobData.output_data && (
                <div className="space-y-3">
                  <h3 className="font-semibold">Generation Summary</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2">
                          <Code className="h-5 w-5 text-primary" />
                          <div>
                            <div className="text-2xl font-bold">
                              {jobData.output_data.summary?.components_created || 0}
                            </div>
                            <div className="text-xs text-muted-foreground">Components</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2">
                          <Database className="h-5 w-5 text-primary" />
                          <div>
                            <div className="text-2xl font-bold">
                              {jobData.output_data.summary?.tables_created || 0}
                            </div>
                            <div className="text-xs text-muted-foreground">Tables</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-5 w-5 text-primary" />
                          <div>
                            <div className="text-2xl font-bold">
                              {jobData.output_data.summary?.features_implemented || 0}
                            </div>
                            <div className="text-xs text-muted-foreground">Features</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {/* Generated Files */}
              {generatedFiles.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold">Generated Files</h3>
                  {generatedFiles.map((file, idx) => (
                    <Card key={idx}>
                      <CardHeader>
                        <CardTitle className="text-sm flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileCode className="h-4 w-4" />
                            {file.path}
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => downloadFile(file)}
                          >
                            Download
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <pre className="text-xs bg-muted p-3 rounded overflow-x-auto max-h-48">
                          <code>{file.content}</code>
                        </pre>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Examples */}
        <Card>
          <CardHeader>
            <CardTitle>Example Prompts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Button 
              variant="outline" 
              className="w-full justify-start h-auto p-3 text-left"
              onClick={() => setPrompt('Build a blog platform with user authentication, create/edit/delete posts, markdown support, comments, and tags.')}
              disabled={isGenerating}
            >
              Blog platform with markdown and comments
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start h-auto p-3 text-left"
              onClick={() => setPrompt('Create an expense tracker with categories, monthly budgets, charts showing spending patterns, and receipt uploads.')}
              disabled={isGenerating}
            >
              Expense tracker with budgets and charts
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start h-auto p-3 text-left"
              onClick={() => setPrompt('Build a project management tool with kanban boards, task assignments, due dates, file attachments, and team collaboration.')}
              disabled={isGenerating}
            >
              Project management with kanban boards
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}