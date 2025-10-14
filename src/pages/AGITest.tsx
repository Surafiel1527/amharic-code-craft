import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

const mediumWebsiteExamples = [
  "Build a full e-commerce website with product catalog, shopping cart, checkout, and admin dashboard",
  "Create a job board platform with job listings, company profiles, application tracking, and search filters",
  "Develop a real estate website with property listings, virtual tours, agent profiles, and mortgage calculator",
  "Build a restaurant website with menu management, online ordering, table reservations, and customer reviews"
];

export default function AGITest() {
  const [request, setRequest] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [decision, setDecision] = useState<any>(null);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState('');

  const analyzeRequest = async () => {
    if (!request.trim()) return;

    setIsProcessing(true);
    setDecision(null);
    setExecutionResult(null);
    setProgress(10);
    setCurrentPhase('Analyzing request...');

    try {
      const { data, error } = await supabase.functions.invoke('mega-mind-orchestrator', {
        body: {
          action: 'analyze',
          userRequest: request,
          conversationId: crypto.randomUUID(),
          projectId: crypto.randomUUID()
        }
      });

      if (error) throw error;

      setDecision(data);
      setProgress(30);
      setCurrentPhase('Analysis complete');
    } catch (error: any) {
      console.error('Analysis error:', error);
      alert('Analysis failed: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const executeGeneration = async () => {
    if (!decision) return;

    setIsProcessing(true);
    setProgress(40);
    setCurrentPhase('Executing generation plan...');

    try {
      const { data, error } = await supabase.functions.invoke('mega-mind-orchestrator', {
        body: {
          action: 'execute',
          decision,
          conversationId: crypto.randomUUID(),
          projectId: crypto.randomUUID()
        }
      });

      if (error) throw error;

      setExecutionResult(data);
      setProgress(100);
      setCurrentPhase('Generation complete');
    } catch (error: any) {
      console.error('Execution error:', error);
      alert('Execution failed: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">AGI Orchestrator Test</h1>
        <p className="text-muted-foreground">
          Test the Mega Mind AGI by building medium-complexity websites
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Example Requests</CardTitle>
            <CardDescription>Click to use these medium-complexity examples</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {mediumWebsiteExamples.map((example, index) => (
              <Button
                key={index}
                variant="outline"
                className="w-full justify-start text-left h-auto py-3"
                onClick={() => setRequest(example)}
              >
                {example}
              </Button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Request</CardTitle>
            <CardDescription>Describe the website you want to build</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              placeholder="Enter your website request here..."
              className="min-h-[200px]"
            />
            <Button
              onClick={analyzeRequest}
              disabled={!request.trim() || isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                'Analyze Request'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {(decision || executionResult || progress > 0) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Progress</CardTitle>
            <CardDescription>{currentPhase}</CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={progress} className="mb-2" />
            <p className="text-sm text-muted-foreground">{progress}% complete</p>
          </CardContent>
        </Card>
      )}

      {decision && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>AGI Analysis</CardTitle>
            <CardDescription>Decision and execution plan from Mega Mind</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Understood</p>
                <Badge variant={decision.understood ? "default" : "destructive"}>
                  {decision.understood ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Confidence</p>
                <Badge variant="secondary">
                  {(decision.confidence * 100).toFixed(0)}%
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Complexity</p>
                <Badge variant={
                  decision.complexity === 'high' ? 'destructive' :
                  decision.complexity === 'medium' ? 'default' : 'secondary'
                }>
                  {decision.complexity}
                </Badge>
              </div>
            </div>

            {decision.reasoning && (
              <div>
                <p className="text-sm font-medium mb-2">AI Reasoning:</p>
                <p className="text-sm text-muted-foreground">{decision.reasoning}</p>
              </div>
            )}

            {decision.requiredPhases && decision.requiredPhases.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Required Phases:</p>
                <div className="flex flex-wrap gap-2">
                  {decision.requiredPhases.map((phase: string, index: number) => (
                    <Badge key={index} variant="outline">{phase}</Badge>
                  ))}
                </div>
              </div>
            )}

            {decision.plan && decision.plan.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Execution Plan:</p>
                <div className="space-y-2">
                  {decision.plan.map((step: any, index: number) => (
                    <Card key={index}>
                      <CardContent className="pt-4">
                        <p className="font-medium">{step.phase}</p>
                        {step.actions && step.actions.length > 0 && (
                          <ul className="list-disc list-inside text-sm text-muted-foreground mt-2">
                            {step.actions.map((action: string, i: number) => (
                              <li key={i}>{action}</li>
                            ))}
                          </ul>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            <Button
              onClick={executeGeneration}
              disabled={isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Executing...
                </>
              ) : (
                'Execute Generation'
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {executionResult && (
        <Card>
          <CardHeader>
            <CardTitle>Execution Results</CardTitle>
            <CardDescription>Generated files and output</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Status:</p>
                <Badge variant={executionResult.success ? "default" : "destructive"}>
                  {executionResult.success ? 'Success' : 'Failed'}
                </Badge>
              </div>

              {executionResult.generatedFiles && executionResult.generatedFiles.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">
                    Generated {executionResult.generatedFiles.length} Files:
                  </p>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {executionResult.generatedFiles.map((file: any, index: number) => (
                      <Card key={index}>
                        <CardContent className="pt-4">
                          <p className="font-mono text-sm mb-2">{file.path}</p>
                          <pre className="text-xs bg-muted p-3 rounded overflow-x-auto max-h-[200px]">
                            {file.content}
                          </pre>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {executionResult.error && (
                <div>
                  <p className="text-sm font-medium mb-2 text-destructive">Error:</p>
                  <p className="text-sm text-muted-foreground">{executionResult.error}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
