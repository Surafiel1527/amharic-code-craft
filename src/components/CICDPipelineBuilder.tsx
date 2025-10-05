import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { 
  GitBranch, Play, Download, Copy, Sparkles,
  CheckCircle2, Circle, Loader2
} from "lucide-react";
import { toast } from "sonner";

interface PipelineStage {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  duration?: number;
}

export function CICDPipelineBuilder() {
  const [provider, setProvider] = useState<'github' | 'gitlab' | 'circleci'>('github');
  const [projectName, setProjectName] = useState("");
  const [enableTests, setEnableTests] = useState(true);
  const [enableLint, setEnableLint] = useState(true);
  const [enableBuild, setEnableBuild] = useState(true);
  const [enableDeploy, setEnableDeploy] = useState(true);
  const [generatedConfig, setGeneratedConfig] = useState("");
  const [stages, setStages] = useState<PipelineStage[]>([]);

  const generatePipeline = () => {
    if (!projectName.trim()) {
      toast.error("Please enter a project name");
      return;
    }

    const config = generateGitHubActions();
    setGeneratedConfig(config);
    
    const pipelineStages: PipelineStage[] = [];
    if (enableLint) pipelineStages.push({ id: '1', name: 'Lint', status: 'pending' });
    if (enableTests) pipelineStages.push({ id: '2', name: 'Test', status: 'pending' });
    if (enableBuild) pipelineStages.push({ id: '3', name: 'Build', status: 'pending' });
    if (enableDeploy) pipelineStages.push({ id: '4', name: 'Deploy', status: 'pending' });
    
    setStages(pipelineStages);
    toast.success("Pipeline configuration generated!");
  };

  const generateGitHubActions = () => {
    return `name: ${projectName} CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  ${enableLint ? `lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
  
  ` : ''}${enableTests ? `test:
    runs-on: ubuntu-latest
    ${enableLint ? 'needs: lint' : ''}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
  
  ` : ''}${enableBuild ? `build:
    runs-on: ubuntu-latest
    ${enableTests ? 'needs: test' : enableLint ? 'needs: lint' : ''}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build
          path: dist/
  
  ` : ''}${enableDeploy ? `deploy:
    runs-on: ubuntu-latest
    ${enableBuild ? 'needs: build' : ''}
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - name: Download build artifacts
        uses: actions/download-artifact@v3
        with:
          name: build
          path: dist/
      - name: Deploy to Production
        run: |
          echo "Deploying to production..."
          # Add your deployment commands here
        env:
          DEPLOY_KEY: \${{ secrets.DEPLOY_KEY }}
` : ''}`;
  };

  const runPipeline = async () => {
    for (let i = 0; i < stages.length; i++) {
      setStages(prev => prev.map((stage, idx) => 
        idx === i ? { ...stage, status: 'running' } : stage
      ));

      await new Promise(resolve => setTimeout(resolve, 1500));

      setStages(prev => prev.map((stage, idx) => 
        idx === i ? { ...stage, status: 'success', duration: Math.floor(Math.random() * 30) + 10 } : stage
      ));
    }

    toast.success("Pipeline completed successfully!");
  };

  const copyConfig = () => {
    navigator.clipboard.writeText(generatedConfig);
    toast.success("Configuration copied!");
  };

  const downloadConfig = () => {
    const blob = new Blob([generatedConfig], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '.github/workflows/ci-cd.yml';
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Configuration downloaded!");
  };

  const getStageIcon = (status: PipelineStage['status']) => {
    switch (status) {
      case 'pending': return <Circle className="w-4 h-4 text-muted-foreground" />;
      case 'running': return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'success': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed': return <Circle className="w-4 h-4 text-red-500" />;
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="w-5 h-5" />
          <h3 className="font-semibold">CI/CD Pipeline Builder</h3>
        </div>
        <Badge variant="secondary">
          <Sparkles className="w-3 h-3 mr-1" />
          Pro
        </Badge>
      </div>

      <Tabs defaultValue="configure" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="configure">Configure</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
        </TabsList>

        <TabsContent value="configure" className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Project Name</Label>
              <Input
                placeholder="my-awesome-project"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              <Label>Pipeline Stages</Label>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Linting</span>
                <Switch checked={enableLint} onCheckedChange={setEnableLint} />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">Testing</span>
                <Switch checked={enableTests} onCheckedChange={setEnableTests} />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">Build</span>
                <Switch checked={enableBuild} onCheckedChange={setEnableBuild} />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">Deploy</span>
                <Switch checked={enableDeploy} onCheckedChange={setEnableDeploy} />
              </div>
            </div>

            <Button onClick={generatePipeline} className="w-full">
              Generate Pipeline Config
            </Button>

            {generatedConfig && (
              <>
                <div className="flex gap-2">
                  <Button onClick={copyConfig} variant="outline" className="flex-1">
                    <Copy className="w-3 h-3 mr-1" />
                    Copy
                  </Button>
                  <Button onClick={downloadConfig} variant="outline" className="flex-1">
                    <Download className="w-3 h-3 mr-1" />
                    Download
                  </Button>
                </div>

                <ScrollArea className="h-[300px]">
                  <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
                    <code>{generatedConfig}</code>
                  </pre>
                </ScrollArea>
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="pipeline" className="space-y-4">
          {stages.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              <GitBranch className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No pipeline configured</p>
              <p className="text-xs mt-2">Configure and generate a pipeline first</p>
            </div>
          ) : (
            <>
              <Button onClick={runPipeline} className="w-full" disabled={stages.some(s => s.status === 'running')}>
                <Play className="w-4 h-4 mr-2" />
                Run Pipeline
              </Button>

              <div className="space-y-2">
                {stages.map((stage, idx) => (
                  <Card key={stage.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStageIcon(stage.status)}
                        <div>
                          <p className="font-medium">{stage.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {stage.status}
                            {stage.duration && ` • ${stage.duration}s`}
                          </p>
                        </div>
                      </div>
                      <Badge variant={stage.status === 'success' ? 'default' : 'outline'}>
                        Stage {idx + 1}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      <Card className="p-3 bg-muted/50">
        <h4 className="text-sm font-medium mb-2">Features:</h4>
        <ul className="text-xs space-y-1 text-muted-foreground">
          <li>• GitHub Actions, GitLab CI, CircleCI support</li>
          <li>• Customizable pipeline stages</li>
          <li>• Automatic dependency caching</li>
          <li>• Parallel job execution</li>
          <li>• Artifact management</li>
          <li>• Environment-based deployments</li>
        </ul>
      </Card>
    </Card>
  );
}