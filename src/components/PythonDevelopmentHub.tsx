import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Play, Code2, FileCode, Download, Copy, Zap, 
  Brain, Package, CheckCircle2, XCircle, Terminal,
  Sparkles, Rocket
} from "lucide-react";

export default function PythonDevelopmentHub() {
  const [activeTab, setActiveTab] = useState("executor");
  
  // Executor State
  const [pythonCode, setPythonCode] = useState(`# Python Code Executor
print("Hello from Python!")

# Example: Simple calculation
numbers = [1, 2, 3, 4, 5]
result = sum(numbers)
print(f"Sum of {numbers} = {result}")

# Example: List comprehension
squares = [x**2 for x in range(10)]
print(f"Squares: {squares}")`);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  // Project Generator State
  const [projectRequest, setProjectRequest] = useState("");
  const [projectName, setProjectName] = useState("my-python-app");
  const [projectType, setProjectType] = useState<"flask" | "django" | "fastapi" | "script" | "data-science" | "pygame">("flask");
  const [generatedProject, setGeneratedProject] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Language Detector State
  const [detectionRequest, setDetectionRequest] = useState("");
  const [detectionResult, setDetectionResult] = useState<any>(null);
  const [isDetecting, setIsDetecting] = useState(false);

  const handleExecute = async () => {
    if (!pythonCode.trim()) {
      toast.error("Please enter Python code");
      return;
    }

    setIsExecuting(true);
    setExecutionResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('python-executor', {
        body: { code: pythonCode, packages: [] }
      });

      if (error) throw error;

      setExecutionResult(data);
      
      if (data.success) {
        toast.success(`Executed in ${data.executionTime}ms!`);
      } else {
        toast.error("Execution failed", {
          description: data.error?.substring(0, 100)
        });
      }
    } catch (error: any) {
      console.error('Execution error:', error);
      toast.error(error.message || 'Execution failed');
      setExecutionResult({
        success: false,
        output: '',
        error: error.message,
        executionTime: 0,
        exitCode: 1
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleGenerateProject = async () => {
    if (!projectRequest.trim()) {
      toast.error("Please describe what you want to build");
      return;
    }

    setIsGenerating(true);
    setGeneratedProject(null);

    try {
      const { data, error } = await supabase.functions.invoke('python-project-generator', {
        body: { 
          userRequest: projectRequest,
          projectType,
          projectName
        }
      });

      if (error) throw error;

      setGeneratedProject(data);
      toast.success("Python project generated!", {
        description: `${data.files.length} files created`
      });
    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error(error.message || 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDetectLanguage = async () => {
    if (!detectionRequest.trim()) {
      toast.error("Please enter a request to analyze");
      return;
    }

    setIsDetecting(true);
    setDetectionResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('intelligent-language-detector', {
        body: { userRequest: detectionRequest }
      });

      if (error) throw error;

      setDetectionResult(data);
      toast.success(`Detected: ${data.language}`, {
        description: `Confidence: ${data.confidence}%`
      });
    } catch (error: any) {
      console.error('Detection error:', error);
      toast.error(error.message || 'Detection failed');
    } finally {
      setIsDetecting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const downloadProject = () => {
    if (!generatedProject) return;
    
    // Create a simple text representation for download
    let content = `# ${generatedProject.projectName}\n\n`;
    content += `## Files:\n\n`;
    
    generatedProject.files.forEach((file: any) => {
      content += `### ${file.path}\n\`\`\`python\n${file.content}\n\`\`\`\n\n`;
    });
    
    content += `## Dependencies:\n${generatedProject.dependencies.join('\n')}\n\n`;
    content += `## Setup:\n${generatedProject.setupInstructions}\n\n`;
    content += `## Run:\n${generatedProject.runCommand}\n`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${generatedProject.projectName}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success("Project downloaded!");
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-green-500">
          <Code2 className="w-8 h-8 text-white" />
        </div>
        <div>
          <h1 className="text-4xl font-bold">🐍 Python Development Hub</h1>
          <p className="text-muted-foreground">
            Execute Python code, generate projects, and detect languages with AI
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="executor" className="gap-2">
            <Play className="w-4 h-4" />
            Python Executor
          </TabsTrigger>
          <TabsTrigger value="generator" className="gap-2">
            <Rocket className="w-4 h-4" />
            Project Generator
          </TabsTrigger>
          <TabsTrigger value="detector" className="gap-2">
            <Brain className="w-4 h-4" />
            Language Detector
          </TabsTrigger>
        </TabsList>

        {/* Python Executor Tab */}
        <TabsContent value="executor" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-green-500" />
                  Python Code Editor
                </CardTitle>
                <CardDescription>Write and execute Python code instantly</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={pythonCode}
                  onChange={(e) => setPythonCode(e.target.value)}
                  placeholder="Write your Python code here..."
                  className="font-mono text-sm min-h-[400px]"
                />
                
                <Button
                  onClick={handleExecute}
                  disabled={isExecuting || !pythonCode}
                  className="w-full"
                  size="lg"
                >
                  {isExecuting ? (
                    <>
                      <Zap className="w-4 h-4 mr-2 animate-spin" />
                      Executing...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Execute Python Code
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Execution Output</CardTitle>
                <CardDescription>
                  {executionResult 
                    ? `Completed in ${executionResult.executionTime}ms`
                    : 'Output will appear here'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {executionResult ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      {executionResult.success ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                          <Badge variant="default" className="bg-green-500">Success</Badge>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-5 h-5 text-red-500" />
                          <Badge variant="destructive">Failed</Badge>
                        </>
                      )}
                      <Badge variant="outline">Exit Code: {executionResult.exitCode}</Badge>
                    </div>

                    {executionResult.output && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-sm">Output</h4>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => copyToClipboard(executionResult.output)}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                        <ScrollArea className="h-[300px] rounded-md border">
                          <pre className="p-3 text-sm font-mono">
                            {executionResult.output}
                          </pre>
                        </ScrollArea>
                      </div>
                    )}

                    {executionResult.error && (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm text-red-500">Error</h4>
                        <ScrollArea className="h-[150px] rounded-md border bg-red-50 dark:bg-red-950/20">
                          <pre className="p-3 text-sm font-mono text-red-600 dark:text-red-400">
                            {executionResult.error}
                          </pre>
                        </ScrollArea>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[400px] text-center">
                    <Terminal className="w-12 h-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Write Python code and click Execute to see results
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Project Generator Tab */}
        <TabsContent value="generator" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Rocket className="w-5 h-5 text-purple-500" />
                  Python Project Generator
                </CardTitle>
                <CardDescription>Generate complete Python projects with AI</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>What do you want to build?</Label>
                  <Textarea
                    value={projectRequest}
                    onChange={(e) => setProjectRequest(e.target.value)}
                    placeholder="Example: A Flask API for managing tasks with SQLite database"
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Project Name</Label>
                  <Input
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="my-python-app"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Project Type</Label>
                  <Select value={projectType} onValueChange={(value: any) => setProjectType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flask">Flask Web App</SelectItem>
                      <SelectItem value="fastapi">FastAPI</SelectItem>
                      <SelectItem value="django">Django</SelectItem>
                      <SelectItem value="script">Python Script</SelectItem>
                      <SelectItem value="data-science">Data Science</SelectItem>
                      <SelectItem value="pygame">Pygame Game</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleGenerateProject}
                  disabled={isGenerating || !projectRequest}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Rocket className="w-4 h-4 mr-2" />
                      Generate Python Project
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Generated Project</CardTitle>
                <CardDescription>
                  {generatedProject 
                    ? `${generatedProject.files.length} files created`
                    : 'Project files will appear here'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {generatedProject ? (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">{generatedProject.projectType}</Badge>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={downloadProject}
                        >
                          <Download className="w-3 h-3 mr-2" />
                          Download
                        </Button>
                      </div>

                      {generatedProject.files.map((file: any, idx: number) => (
                        <div key={idx} className="space-y-2 p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <FileCode className="w-4 h-4 text-primary" />
                              <span className="font-mono text-sm font-medium">{file.path}</span>
                            </div>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => copyToClipboard(file.content)}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">{file.description}</p>
                          <pre className="p-2 bg-muted rounded text-xs font-mono max-h-[150px] overflow-auto">
                            {file.content}
                          </pre>
                        </div>
                      ))}

                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          Dependencies
                        </h4>
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <code className="text-xs whitespace-pre-wrap">
                            {generatedProject.dependencies.join('\n')}
                          </code>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm">Setup Instructions</h4>
                        <div className="p-3 bg-muted/50 rounded-lg text-sm">
                          {generatedProject.setupInstructions}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm">Run Command</h4>
                        <div className="p-3 bg-muted/50 rounded-lg font-mono text-sm">
                          {generatedProject.runCommand}
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[500px] text-center">
                    <Rocket className="w-12 h-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Describe your project and click generate
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Language Detector Tab */}
        <TabsContent value="detector" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-blue-500" />
                Intelligent Language Detection
              </CardTitle>
              <CardDescription>AI analyzes your request and recommends the best language & framework</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Describe what you want to build</Label>
                    <Textarea
                      value={detectionRequest}
                      onChange={(e) => setDetectionRequest(e.target.value)}
                      placeholder="Example: Build a REST API for a todo app with authentication"
                      rows={10}
                    />
                  </div>

                  <Button
                    onClick={handleDetectLanguage}
                    disabled={isDetecting || !detectionRequest}
                    className="w-full"
                    size="lg"
                  >
                    {isDetecting ? (
                      <>
                        <Brain className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Detect Best Language
                      </>
                    )}
                  </Button>
                </div>

                <div>
                  {detectionResult ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold">Recommended Language</h3>
                          <Badge variant="default" className="text-lg">
                            {detectionResult.language}
                          </Badge>
                        </div>
                        
                        {detectionResult.framework && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Framework:</span>
                            <Badge variant="outline">{detectionResult.framework}</Badge>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Confidence:</span>
                          <Badge variant="secondary">{detectionResult.confidence}%</Badge>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Runtime:</span>
                          <Badge variant="outline">{detectionResult.recommendedRuntime}</Badge>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm">Reasoning</h4>
                        <p className="text-sm text-muted-foreground p-3 bg-muted/50 rounded">
                          {detectionResult.reasoning}
                        </p>
                      </div>

                      {detectionResult.suggestedPackages?.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            Suggested Packages
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {detectionResult.suggestedPackages.map((pkg: string, idx: number) => (
                              <Badge key={idx} variant="secondary">{pkg}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {detectionResult.projectStructure?.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm">Recommended Project Structure</h4>
                          <div className="p-3 bg-muted/50 rounded font-mono text-xs">
                            {detectionResult.projectStructure.map((file: string, idx: number) => (
                              <div key={idx}>📄 {file}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <Brain className="w-12 h-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        Describe your project to get AI recommendations
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
