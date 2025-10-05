import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, Terminal, AlertCircle, CheckCircle, Loader2, Code } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  executionTime?: number;
  memoryUsed?: number;
}

interface SandboxExecutionEnvironmentProps {
  code: string;
  language: 'javascript' | 'typescript' | 'python';
  onExecutionComplete?: (result: ExecutionResult) => void;
}

export const SandboxExecutionEnvironment = ({ 
  code, 
  language,
  onExecutionComplete 
}: SandboxExecutionEnvironmentProps) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const { toast } = useToast();

  const executeCode = async () => {
    setIsExecuting(true);
    setResult(null);

    try {
      let executionResult: ExecutionResult;

      if (language === 'python') {
        const { data, error } = await supabase.functions.invoke('python-executor', {
          body: { code }
        });

        if (error) throw error;

        executionResult = {
          success: data.success,
          output: data.output,
          error: data.error,
          executionTime: data.executionTime
        };
      } else {
        // JavaScript/TypeScript execution
        const { data, error } = await supabase.functions.invoke('terminal-executor', {
          body: { 
            command: language === 'typescript' ? 'ts-node' : 'node',
            args: ['-e', code]
          }
        });

        if (error) throw error;

        executionResult = {
          success: data.success,
          output: data.output,
          error: data.error,
          executionTime: data.executionTime
        };
      }

      setResult(executionResult);
      
      if (onExecutionComplete) {
        onExecutionComplete(executionResult);
      }

      toast({
        title: executionResult.success ? "Execution Successful" : "Execution Failed",
        description: executionResult.success 
          ? `Completed in ${executionResult.executionTime}ms`
          : "Check output for details",
        variant: executionResult.success ? "default" : "destructive"
      });
    } catch (error) {
      console.error('Execution failed:', error);
      const failureResult: ExecutionResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      setResult(failureResult);
      
      toast({
        title: "Execution Error",
        description: failureResult.error,
        variant: "destructive"
      });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Terminal className="h-5 w-5 text-primary" />
            Sandbox Execution Environment
            <Badge variant="outline" className="ml-2">
              {language}
            </Badge>
          </CardTitle>
          <Button 
            onClick={executeCode}
            disabled={isExecuting || !code}
            size="sm"
          >
            {isExecuting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Executing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Code
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="output" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="output">Output</TabsTrigger>
            <TabsTrigger value="code">Code</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
          </TabsList>

          <TabsContent value="output" className="space-y-4">
            {result ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {result.success ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  )}
                  <span className="font-medium">
                    {result.success ? 'Execution Successful' : 'Execution Failed'}
                  </span>
                </div>

                <ScrollArea className="h-[300px] w-full rounded-md border bg-muted/50 p-4">
                  {result.output && (
                    <div className="mb-4">
                      <p className="text-sm font-medium mb-2">Output:</p>
                      <pre className="text-sm whitespace-pre-wrap font-mono">
                        {result.output}
                      </pre>
                    </div>
                  )}
                  
                  {result.error && (
                    <div>
                      <p className="text-sm font-medium mb-2 text-destructive">Error:</p>
                      <pre className="text-sm whitespace-pre-wrap font-mono text-destructive">
                        {result.error}
                      </pre>
                    </div>
                  )}
                </ScrollArea>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                <div className="text-center space-y-2">
                  <Play className="h-12 w-12 mx-auto opacity-50" />
                  <p>Click "Run Code" to execute in sandbox</p>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="code">
            <ScrollArea className="h-[300px] w-full rounded-md border bg-muted/50 p-4">
              <pre className="text-sm font-mono whitespace-pre-wrap">
                {code || 'No code to display'}
              </pre>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="metrics" className="space-y-4">
            {result ? (
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Execution Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {result.executionTime || 0}ms
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge variant={result.success ? "default" : "destructive"}>
                      {result.success ? "Success" : "Failed"}
                    </Badge>
                  </CardContent>
                </Card>

                <Card className="col-span-2">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xl font-bold">
                      {result.memoryUsed ? `${result.memoryUsed}MB` : 'N/A'}
                    </p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                <p>Run code to see execution metrics</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
