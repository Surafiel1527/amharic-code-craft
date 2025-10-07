import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Sparkles, BarChart3, Zap, CheckCircle, XCircle, Clock, Bot } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AutonomousTestingDashboard } from "@/components/AutonomousTestingDashboard";

const TestingHub = () => {
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [testCode, setTestCode] = useState("");
  const [framework, setFramework] = useState("vitest");
  const [testType, setTestType] = useState("unit");
  const [results, setResults] = useState<any>(null);
  const [generatedTest, setGeneratedTest] = useState("");

  const runTests = async () => {
    if (!testCode.trim()) {
      toast({
        title: "No code provided",
        description: "Please enter some code to test",
        variant: "destructive",
      });
      return;
    }

    setIsRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('real-test-execution', {
        body: {
          code: testCode,
          framework,
          projectId: null
        }
      });

      if (error) throw error;

      setResults(data.execution);
      toast({
        title: "Tests executed",
        description: `${data.execution.passed}/${data.execution.total} tests passed`,
      });
    } catch (error: any) {
      console.error('Test execution error:', error);
      toast({
        title: "Test execution failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const generateTests = async () => {
    if (!testCode.trim()) {
      toast({
        title: "No code provided",
        description: "Please enter code to generate tests for",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('unified-test-manager', {
        body: {
          operation: 'generate-tests',
          code: testCode,
          filePath: 'component.tsx',
          framework,
          testType,
          projectId: null
        }
      });

      if (error) throw error;

      setGeneratedTest(data.test.code);
      toast({
        title: "Tests generated",
        description: `AI-generated ${testType} tests ready`,
      });
    } catch (error: any) {
      console.error('Test generation error:', error);
      toast({
        title: "Generation failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">Testing Hub</h1>
          <p className="text-muted-foreground">
            Real test execution, AI-powered generation, and quality assurance
          </p>
        </div>
        <Badge variant="outline" className="h-fit">
          Phase 5C
        </Badge>
      </div>

      <Tabs defaultValue="autonomous" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="autonomous">
            <Bot className="w-4 h-4 mr-2" />
            Autonomous
          </TabsTrigger>
          <TabsTrigger value="execute">
            <Play className="w-4 h-4 mr-2" />
            Execute Tests
          </TabsTrigger>
          <TabsTrigger value="generate">
            <Sparkles className="w-4 h-4 mr-2" />
            AI Generate
          </TabsTrigger>
          <TabsTrigger value="coverage">
            <BarChart3 className="w-4 h-4 mr-2" />
            Coverage
          </TabsTrigger>
          <TabsTrigger value="performance">
            <Zap className="w-4 h-4 mr-2" />
            Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="autonomous" className="space-y-4">
          <AutonomousTestingDashboard />
        </TabsContent>

        <TabsContent value="execute" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Execution</CardTitle>
              <CardDescription>
                Run real tests using Vitest, Jest, or other frameworks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Select value={framework} onValueChange={setFramework}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vitest">Vitest</SelectItem>
                    <SelectItem value="jest">Jest</SelectItem>
                    <SelectItem value="mocha">Mocha</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={runTests} disabled={isRunning}>
                  <Play className="w-4 h-4 mr-2" />
                  {isRunning ? "Running..." : "Run Tests"}
                </Button>
              </div>

              <Textarea
                placeholder="Enter your test code here..."
                value={testCode}
                onChange={(e) => setTestCode(e.target.value)}
                className="font-mono text-sm min-h-[300px]"
              />

              {results && (
                <div className="space-y-4 border-t pt-4">
                  <div className="grid grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-500" />
                          <div>
                            <div className="text-2xl font-bold">{results.passed}</div>
                            <div className="text-sm text-muted-foreground">Passed</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2">
                          <XCircle className="w-5 h-5 text-red-500" />
                          <div>
                            <div className="text-2xl font-bold">{results.failed}</div>
                            <div className="text-sm text-muted-foreground">Failed</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2">
                          <Clock className="w-5 h-5 text-blue-500" />
                          <div>
                            <div className="text-2xl font-bold">{results.duration}ms</div>
                            <div className="text-sm text-muted-foreground">Duration</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="w-5 h-5 text-purple-500" />
                          <div>
                            <div className="text-2xl font-bold">{results.total}</div>
                            <div className="text-sm text-muted-foreground">Total</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {results.details && (
                    <div className="space-y-2">
                      <h3 className="font-semibold">Test Results:</h3>
                      {results.details.map((test: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-2">
                            {test.status === 'passed' ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-500" />
                            )}
                            <span className="font-mono text-sm">{test.name}</span>
                          </div>
                          <Badge variant={test.status === 'passed' ? 'default' : 'destructive'}>
                            {test.duration}ms
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="generate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Test Generation</CardTitle>
              <CardDescription>
                Generate comprehensive tests automatically using AI
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Select value={testType} onValueChange={setTestType}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unit">Unit Tests</SelectItem>
                    <SelectItem value="integration">Integration</SelectItem>
                    <SelectItem value="e2e">End-to-End</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={framework} onValueChange={setFramework}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vitest">Vitest</SelectItem>
                    <SelectItem value="jest">Jest</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={generateTests} disabled={isGenerating}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  {isGenerating ? "Generating..." : "Generate Tests"}
                </Button>
              </div>

              <Textarea
                placeholder="Paste your code here to generate tests..."
                value={testCode}
                onChange={(e) => setTestCode(e.target.value)}
                className="font-mono text-sm min-h-[200px]"
              />

              {generatedTest && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Generated Tests:</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedTest);
                        toast({ title: "Copied to clipboard" });
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                  <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-sm">
                    <code>{generatedTest}</code>
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="coverage">
          <Card>
            <CardHeader>
              <CardTitle>Code Coverage</CardTitle>
              <CardDescription>
                Track test coverage across your codebase
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                Run tests to see coverage metrics
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Performance Benchmarks</CardTitle>
              <CardDescription>
                Monitor performance metrics and detect regressions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                Performance benchmarking coming soon
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TestingHub;
