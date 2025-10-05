import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FlaskConical, 
  Loader2, 
  CheckCircle, 
  XCircle,
  Play,
  Code
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AutomatedTestGeneratorProps {
  sourceCode: string;
  language: string;
  componentName?: string;
}

export const AutomatedTestGenerator = ({ 
  sourceCode, 
  language,
  componentName 
}: AutomatedTestGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [testFramework, setTestFramework] = useState<'vitest' | 'jest' | 'playwright'>('vitest');
  const [testType, setTestType] = useState<'unit' | 'integration' | 'e2e'>('unit');
  const [generatedTests, setGeneratedTests] = useState<string>('');
  const [testId, setTestId] = useState<string | null>(null);
  const { toast } = useToast();

  const generateTests = async () => {
    if (!sourceCode || sourceCode.trim().length === 0) {
      toast({
        title: "No Code",
        description: "Please provide source code to generate tests",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('automated-test-generator', {
        body: {
          sourceCode,
          language,
          testFramework,
          testType,
          componentName
        }
      });

      if (error) throw error;

      if (data.success) {
        setGeneratedTests(data.testCode);
        setTestId(data.testId);
        
        toast({
          title: "Tests Generated",
          description: `${testType} tests created successfully`,
        });
      }
    } catch (error) {
      console.error('Test generation failed:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate tests",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedTests);
    toast({
      title: "Copied",
      description: "Test code copied to clipboard",
    });
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FlaskConical className="h-5 w-5 text-primary" />
            Automated Test Generation
          </CardTitle>
          
          {generatedTests && (
            <Badge variant="default">
              <CheckCircle className="h-3 w-3 mr-1" />
              Tests Ready
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Test Framework</label>
            <Select 
              value={testFramework} 
              onValueChange={(value: any) => setTestFramework(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vitest">Vitest</SelectItem>
                <SelectItem value="jest">Jest</SelectItem>
                <SelectItem value="playwright">Playwright</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Test Type</label>
            <Select 
              value={testType} 
              onValueChange={(value: any) => setTestType(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unit">Unit Tests</SelectItem>
                <SelectItem value="integration">Integration Tests</SelectItem>
                <SelectItem value="e2e">End-to-End Tests</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button 
          onClick={generateTests}
          disabled={isGenerating || !sourceCode}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating Tests...
            </>
          ) : (
            <>
              <FlaskConical className="h-4 w-4 mr-2" />
              Generate Tests
            </>
          )}
        </Button>

        {generatedTests && (
          <Tabs defaultValue="preview" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="source">Source Code</TabsTrigger>
            </TabsList>

            <TabsContent value="preview" className="space-y-4">
              <ScrollArea className="h-[400px] w-full rounded-md border bg-muted/50 p-4">
                <pre className="text-sm font-mono whitespace-pre-wrap">
                  {generatedTests}
                </pre>
              </ScrollArea>
              
              <div className="flex gap-2">
                <Button 
                  onClick={copyToClipboard}
                  variant="outline"
                  className="flex-1"
                >
                  <Code className="h-4 w-4 mr-2" />
                  Copy Code
                </Button>
                <Button 
                  variant="outline"
                  className="flex-1"
                  disabled
                >
                  <Play className="h-4 w-4 mr-2" />
                  Run Tests (Coming Soon)
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Framework</p>
                  <Badge variant="secondary">{testFramework}</Badge>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Type</p>
                  <Badge variant="secondary">{testType}</Badge>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Lines</p>
                  <Badge variant="secondary">{generatedTests.split('\n').length}</Badge>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="source">
              <ScrollArea className="h-[400px] w-full rounded-md border bg-muted/50 p-4">
                <pre className="text-sm font-mono whitespace-pre-wrap">
                  {sourceCode}
                </pre>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};
