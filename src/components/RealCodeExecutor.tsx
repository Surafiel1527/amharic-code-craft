import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, CheckCircle, XCircle, Loader2, Code2, Monitor } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ExecutionResult {
  success: boolean;
  output: string;
  error: string | null;
  executionTime: number;
  memoryUsed: number;
  compiledCode?: string;
}

interface RealCodeExecutorProps {
  code: string;
  language: 'javascript' | 'typescript' | 'react' | 'python';
  projectId?: string;
  autoExecute?: boolean;
  onExecutionComplete?: (result: ExecutionResult) => void;
}

export default function RealCodeExecutor({
  code,
  language,
  projectId,
  autoExecute = false,
  onExecutionComplete
}: RealCodeExecutorProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [livePreview, setLivePreview] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (autoExecute && code) {
      executeCode();
    }
  }, [autoExecute, code]);

  const executeCode = async () => {
    setIsExecuting(true);
    setResult(null);

    try {
      if (language === 'react') {
        await executeReactCode();
      } else {
        await executeServerSide();
      }
    } catch (error) {
      const errorResult: ExecutionResult = {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: 0,
        memoryUsed: 0
      };
      setResult(errorResult);
      toast({
        title: 'Execution Failed',
        description: errorResult.error || 'Unknown error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const executeReactCode = async () => {
    const startTime = performance.now();

    try {
      // Create a complete HTML document with React and Tailwind
      const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { margin: 0; padding: 16px; font-family: system-ui, -apple-system, sans-serif; }
    .error { color: #ef4444; padding: 12px; background: #fee; border-radius: 8px; margin: 8px 0; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    const { useState, useEffect, useCallback } = React;
    
    try {
      ${code}
      
      // Auto-render if there's a default export
      const rootElement = document.getElementById('root');
      if (typeof App !== 'undefined') {
        ReactDOM.render(<App />, rootElement);
      } else {
        // Try to find and render any component
        const componentNames = Object.keys(window).filter(key => 
          key[0] === key[0].toUpperCase() && typeof window[key] === 'function'
        );
        if (componentNames.length > 0) {
          const Component = window[componentNames[0]];
          ReactDOM.render(<Component />, rootElement);
        } else {
          rootElement.innerHTML = '<div class="error">No React component found. Make sure to export a component.</div>';
        }
      }
      
      window.parent.postMessage({ type: 'success', message: 'Code executed successfully' }, '*');
    } catch (error) {
      console.error(error);
      document.getElementById('root').innerHTML = 
        '<div class="error"><strong>Error:</strong> ' + error.message + '</div>';
      window.parent.postMessage({ type: 'error', error: error.message }, '*');
    }
  </script>
</body>
</html>`;

      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      setLivePreview(url);

      // Listen for messages from iframe
      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'success' || event.data.type === 'error') {
          const executionTime = performance.now() - startTime;
          const execResult: ExecutionResult = {
            success: event.data.type === 'success',
            output: event.data.type === 'success' ? 'Component rendered successfully' : '',
            error: event.data.error || null,
            executionTime: Math.round(executionTime),
            memoryUsed: 0,
            compiledCode: htmlContent
          };
          setResult(execResult);
          if (onExecutionComplete) onExecutionComplete(execResult);
          
          toast({
            title: execResult.success ? 'Execution Successful' : 'Execution Failed',
            description: execResult.success ? 'React component rendered' : execResult.error,
            variant: execResult.success ? 'default' : 'destructive'
          });
        }
      };

      window.addEventListener('message', handleMessage);
      
      // Cleanup
      return () => {
        window.removeEventListener('message', handleMessage);
        URL.revokeObjectURL(url);
      };

    } catch (error) {
      throw error;
    }
  };

  const executeServerSide = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase.functions.invoke('code-executor', {
      body: {
        code,
        language: language === 'typescript' ? 'typescript' : 'javascript',
        projectId,
        userId: user?.id
      }
    });

    if (error) throw error;

    const execResult: ExecutionResult = data.result;
    setResult(execResult);
    if (onExecutionComplete) onExecutionComplete(execResult);

    toast({
      title: execResult.success ? 'Execution Successful' : 'Execution Failed',
      description: execResult.success 
        ? `Completed in ${execResult.executionTime}ms` 
        : execResult.error,
      variant: execResult.success ? 'default' : 'destructive'
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Code2 className="h-5 w-5" />
            Real Code Executor
          </CardTitle>
          <Button
            onClick={executeCode}
            disabled={isExecuting || !code}
            size="sm"
          >
            {isExecuting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Executing...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Run Code
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={language === 'react' ? 'preview' : 'output'} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            {language === 'react' && (
              <TabsTrigger value="preview">
                <Monitor className="mr-2 h-4 w-4" />
                Preview
              </TabsTrigger>
            )}
            <TabsTrigger value="output">Output</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
          </TabsList>

          {language === 'react' && (
            <TabsContent value="preview" className="mt-4">
              {livePreview ? (
                <div className="border rounded-lg overflow-hidden bg-background">
                  <iframe
                    ref={iframeRef}
                    src={livePreview}
                    className="w-full h-[400px] border-0"
                    sandbox="allow-scripts allow-same-origin"
                    title="Code Preview"
                  />
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  Click "Run Code" to see live preview
                </div>
              )}
            </TabsContent>
          )}

          <TabsContent value="output" className="mt-4">
            <ScrollArea className="h-[300px] w-full rounded-lg border bg-muted/50 p-4">
              {result ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-4">
                    {result.success ? (
                      <Badge variant="default" className="gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Success
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1">
                        <XCircle className="h-3 w-3" />
                        Failed
                      </Badge>
                    )}
                  </div>

                  {result.output && (
                    <div>
                      <div className="text-sm font-medium mb-1">Output:</div>
                      <pre className="text-sm whitespace-pre-wrap font-mono bg-background p-3 rounded">
                        {result.output}
                      </pre>
                    </div>
                  )}

                  {result.error && (
                    <div>
                      <div className="text-sm font-medium mb-1 text-destructive">Error:</div>
                      <pre className="text-sm whitespace-pre-wrap font-mono bg-destructive/10 p-3 rounded text-destructive">
                        {result.error}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-muted-foreground">
                  No execution result yet. Click "Run Code" to execute.
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="metrics" className="mt-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">
                    {result?.executionTime ?? '-'}ms
                  </div>
                  <p className="text-xs text-muted-foreground">Execution Time</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">
                    {result?.memoryUsed ?? '-'}MB
                  </div>
                  <p className="text-xs text-muted-foreground">Memory Used</p>
                </CardContent>
              </Card>
            </div>

            {result?.compiledCode && (
              <div className="mt-4">
                <div className="text-sm font-medium mb-2">Compiled Code:</div>
                <ScrollArea className="h-[200px] w-full rounded-lg border bg-muted/50 p-4">
                  <pre className="text-xs font-mono">
                    {result.compiledCode}
                  </pre>
                </ScrollArea>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
