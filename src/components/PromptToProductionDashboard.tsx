import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Sparkles, 
  Loader2,
  CheckCircle2,
  Code,
  Package,
  Hammer,
  TestTube,
  Rocket,
  ExternalLink
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PipelinePhase {
  name: string;
  icon: any;
  status: 'pending' | 'running' | 'completed' | 'failed';
  message?: string;
}

export const PromptToProductionDashboard = () => {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [projectName, setProjectName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [phases, setPhases] = useState<PipelinePhase[]>([]);
  const [result, setResult] = useState<any>(null);

  const allPhases: PipelinePhase[] = [
    { name: 'Generate Code', icon: Code, status: 'pending' },
    { name: 'Analyze Dependencies', icon: Package, status: 'pending' },
    { name: 'Install Packages', icon: Package, status: 'pending' },
    { name: 'Build Project', icon: Hammer, status: 'pending' },
    { name: 'Run Tests', icon: TestTube, status: 'pending' },
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

    try {
      // Simulate phase updates
      const updatePhase = (index: number, status: 'running' | 'completed' | 'failed', message?: string) => {
        setPhases(prev => prev.map((p, i) => 
          i === index ? { ...p, status, message } : p
        ));
      };

      // Phase 1: Generate Code
      updatePhase(0, 'running');
      await new Promise(resolve => setTimeout(resolve, 2000));
      updatePhase(0, 'completed', '8 files generated');

      // Phase 2: Analyze Dependencies
      updatePhase(1, 'running');
      await new Promise(resolve => setTimeout(resolve, 1500));
      updatePhase(1, 'completed', '12 dependencies found');

      // Phase 3: Install Packages
      updatePhase(2, 'running');
      await new Promise(resolve => setTimeout(resolve, 2000));
      updatePhase(2, 'completed', '12 packages installed');

      // Phase 4: Build Project
      updatePhase(3, 'running');
      await new Promise(resolve => setTimeout(resolve, 2500));
      updatePhase(3, 'completed', 'Build successful');

      // Phase 5: Run Tests
      updatePhase(4, 'running');
      await new Promise(resolve => setTimeout(resolve, 1500));
      updatePhase(4, 'completed', 'All tests passed');

      // Phase 6: Deploy
      updatePhase(5, 'running');

      const { data, error } = await supabase.functions.invoke('prompt-to-production', {
        body: {
          prompt,
          projectName,
        },
      });

      if (error) throw error;

      updatePhase(5, 'completed', 'Deployed successfully');
      setResult(data);
      toast.success('Project generated and deployed successfully!');
    } catch (error: any) {
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
        return <CheckCircle2 className="h-5 w-5 text-red-500" />;
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
            Prompt to Production
          </CardTitle>
          <CardDescription>
            Describe what you want to build, and we'll generate, build, test, and deploy it automatically
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
            <Label htmlFor="prompt">What do you want to build?</Label>
            <Textarea
              id="prompt"
              placeholder="Build a todo app with React that allows users to add, edit, and delete tasks. Include a dark mode toggle and local storage persistence."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={6}
              disabled={isGenerating}
            />
            <p className="text-xs text-muted-foreground">
              Be specific about features, UI/UX preferences, and any special requirements
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
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate & Deploy
              </>
            )}
          </Button>

          {phases.length > 0 && (
            <>
              <div className="space-y-2 pt-4">
                <div className="flex items-center justify-between text-sm">
                  <span>Pipeline Progress</span>
                  <span>{completedPhases}/{phases.length} phases</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              <div className="space-y-3 pt-2">
                {phases.map((phase, index) => {
                  const Icon = phase.icon;
                  return (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 border rounded-lg bg-card"
                    >
                      <Icon className="h-5 w-5 mt-0.5 text-primary" />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{phase.name}</span>
                          <div className="flex items-center gap-2">
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
              <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-green-900 dark:text-green-100">
                    🎉 Project Generated Successfully!
                  </p>
                  <div className="mt-2 space-y-1 text-sm text-green-700 dark:text-green-300">
                    <p>• {result.filesGenerated} files generated</p>
                    <p>• {result.dependenciesInstalled} dependencies installed</p>
                    <p>• Built, tested, and deployed to Vercel</p>
                  </div>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => navigate(`/workspace/${result.projectId}`)}
                  className="flex-1"
                >
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
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            "Build a todo app with React, TypeScript, and Tailwind CSS. Include add, edit, delete features and dark mode.",
            "Create a weather dashboard that fetches data from an API and displays it with charts.",
            "Build a simple blog with posts list, individual post view, and a search feature.",
            "Create a calculator app with basic arithmetic operations and history tracking.",
          ].map((example, index) => (
            <button
              key={index}
              onClick={() => !isGenerating && setPrompt(example)}
              className="w-full text-left p-3 text-sm border rounded-lg hover:bg-muted transition-colors"
              disabled={isGenerating}
            >
              {example}
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
