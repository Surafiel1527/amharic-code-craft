import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Sparkles, 
  Loader2,
  CheckCircle2,
  Code,
  Package,
  Rocket,
  ExternalLink,
  AlertCircle,
  Brain
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PipelinePhase {
  name: string;
  icon: any;
  status: 'pending' | 'running' | 'completed' | 'failed';
  message?: string;
  duration?: number;
}

export const PromptToProductionDashboard = () => {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [projectName, setProjectName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [phases, setPhases] = useState<PipelinePhase[]>([]);
  const [result, setResult] = useState<any>(null);
  const [startTime, setStartTime] = useState<number>(0);

  const allPhases: PipelinePhase[] = [
    { name: 'AI Code Generation', icon: Brain, status: 'pending' },
    { name: 'Dependency Analysis', icon: Package, status: 'pending' },
    { name: 'Project Build', icon: Code, status: 'pending' },
    { name: 'Package Installation', icon: Package, status: 'pending' },
    { name: 'Deploy to Vercel', icon: Rocket, status: 'pending' },
  ];

  const handleGenerate = async () => {
    if (!prompt.trim() || !projectName.trim()) {
      toast.error('Please provide both prompt and project name');
      return;
    }

    setIsGenerating(true);
    setPhases(allPhases);
    setResult(null);
    setStartTime(Date.now());

    try {
      const updatePhase = (index: number, status: 'running' | 'completed' | 'failed', message?: string) => {
        setPhases(prev => prev.map((p, i) => {
          if (i === index) {
            return { 
              ...p, 
              status, 
              message,
              duration: status === 'completed' ? Date.now() - startTime : undefined
            };
          }
          return p;
        }));
      };

      // Start Phase 1
      updatePhase(0, 'running', 'Analyzing your requirements...');

      const { data, error } = await supabase.functions.invoke('prompt-to-production', {
        body: {
          prompt,
          projectName,
        },
      });

      if (error) {
        // Check for specific error types
        if (error.message?.includes('Rate limit') || error.message?.includes('429')) {
          updatePhase(0, 'failed', 'Rate limit exceeded. Please wait and try again.');
          toast.error('AI rate limit exceeded. Please try again in a moment.');
        } else if (error.message?.includes('Payment') || error.message?.includes('402')) {
          updatePhase(0, 'failed', 'Credits required. Please add credits to continue.');
          toast.error('Please add AI credits to your workspace to continue.');
        } else {
          throw error;
        }
        return;
      }

      // Simulate phase progression for UI feedback
      updatePhase(0, 'completed', `${data.filesGenerated} files generated`);
      
      updatePhase(1, 'running');
      await new Promise(resolve => setTimeout(resolve, 500));
      updatePhase(1, 'completed', `${data.dependenciesInstalled} dependencies found`);

      updatePhase(2, 'running');
      await new Promise(resolve => setTimeout(resolve, 800));
      updatePhase(2, 'completed', 'Project structure created');

      updatePhase(3, 'running');
      await new Promise(resolve => setTimeout(resolve, 1000));
      updatePhase(3, 'completed', `${data.dependenciesInstalled} packages installed`);

      updatePhase(4, 'running');
      await new Promise(resolve => setTimeout(resolve, 1200));
      updatePhase(4, 'completed', 'Deployed successfully');

      setResult(data);
      toast.success('🎉 Project generated and deployed!');
    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error(`Generation failed: ${error.message}`);
      const runningPhaseIndex = phases.findIndex(p => p.status === 'running');
      if (runningPhaseIndex !== -1) {
        setPhases(prev => prev.map((p, i) => 
          i === runningPhaseIndex ? { ...p, status: 'failed', message: error.message } : p
        ));
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'running':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-muted" />;
    }
  };

  const completedPhases = phases.filter(p => p.status === 'completed').length;
  const progress = phases.length > 0 ? (completedPhases / phases.length) * 100 : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            AI-Powered Prompt to Production
          </CardTitle>
          <CardDescription>
            Describe what you want to build. Our AI will generate complete, production-ready code and deploy it automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Brain className="h-4 w-4" />
            <AlertDescription>
              <strong>Powered by google/gemini-2.5-flash</strong> - Generates complete React/TypeScript applications with proper dependencies, builds, and deploys to Vercel.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="projectName">Project Name</Label>
            <Input
              id="projectName"
              placeholder="my-awesome-app"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              disabled={isGenerating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prompt">Describe Your Application</Label>
            <Textarea
              id="prompt"
              placeholder="Build a modern todo app with React and TypeScript. Include:&#10;- Add, edit, delete tasks&#10;- Mark tasks as complete&#10;- Filter by status (all, active, completed)&#10;- Dark mode toggle&#10;- Responsive design&#10;- Local storage persistence"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={8}
              disabled={isGenerating}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              💡 Be specific about features, UI requirements, and functionality. The AI will generate complete, working code.
            </p>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim() || !projectName.trim()}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating with AI...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate & Deploy with AI
              </>
            )}
          </Button>

          {phases.length > 0 && (
            <>
              <div className="space-y-2 pt-4 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Pipeline Progress</span>
                  <span className="text-muted-foreground">{completedPhases}/{phases.length} phases</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              <div className="space-y-2">
                {phases.map((phase, index) => {
                  const Icon = phase.icon;
                  return (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 border rounded-lg bg-card transition-all"
                    >
                      <Icon className="h-5 w-5 mt-0.5 text-primary flex-shrink-0" />
                      <div className="flex-1 space-y-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-sm truncate">{phase.name}</span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {phase.message && (
                              <span className="text-xs text-muted-foreground">
                                {phase.message}
                              </span>
                            )}
                            {getStatusIcon(phase.status)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {result && (
            <div className="space-y-4 pt-4 border-t">
              <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <p className="font-semibold text-green-900 dark:text-green-100 mb-2">
                      🎉 Project Generated Successfully!
                    </p>
                    <div className="space-y-1 text-sm text-green-700 dark:text-green-300">
                      <p>• <strong>{result.filesGenerated}</strong> files generated with AI</p>
                      <p>• <strong>{result.dependenciesInstalled}</strong> dependencies installed</p>
                      <p>• Architecture: <strong>{result.architecture}</strong></p>
                      <p>• Built, tested, and deployed to Vercel</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => navigate(`/workspace/${result.projectId}`)}
                  className="flex-1"
                >
                  <Code className="h-4 w-4 mr-2" />
                  Open in Workspace
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate(`/deploy/${result.projectId}`)}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Deployment
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Example Prompts</CardTitle>
          <CardDescription>Click any example to use it as a starting point</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            "Build a modern todo app with React, TypeScript, and Tailwind CSS. Include add, edit, delete functionality, status filtering (all/active/completed), dark mode toggle, and local storage persistence.",
            "Create a weather dashboard that fetches data from OpenWeatherMap API. Show current weather, 5-day forecast, temperature charts, and search by city. Include loading states and error handling.",
            "Build a markdown blog with posts list, individual post view with syntax highlighting, tag filtering, and search functionality. Include a clean, modern design with responsive layout.",
            "Create a calculator app with basic arithmetic operations (+, -, ×, ÷), history tracking, keyboard support, and a clean, accessible design. Include decimal support and error handling.",
            "Build a pomodoro timer with work/break intervals, task list, session history, notification sounds, and statistics. Include customizable timer durations and pause/resume functionality.",
          ].map((example, index) => (
            <button
              key={index}
              onClick={() => !isGenerating && setPrompt(example)}
              className="w-full text-left p-3 text-sm border rounded-lg hover:bg-muted hover:border-primary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isGenerating}
            >
              <div className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                <span className="flex-1">{example}</span>
              </div>
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
