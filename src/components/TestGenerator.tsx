import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FlaskConical, Loader2, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TestGeneratorProps {
  code?: string;
  projectId?: string;
}

export const TestGenerator = ({ code: initialCode = "", projectId }: TestGeneratorProps) => {
  const [code, setCode] = useState(initialCode);
  const [framework, setFramework] = useState("jest");
  const [loading, setLoading] = useState(false);
  const [generatedTests, setGeneratedTests] = useState("");
  const [coverage, setCoverage] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!code.trim()) {
      toast.error("Please provide code to test");
      return;
    }

    setLoading(true);
    try {
      // Route to unified-test-manager for test generation
      const { data, error } = await supabase.functions.invoke('unified-test-manager', {
        body: { 
          operation: 'generate-tests',
          code,
          projectId,
          framework 
        }
      });

      if (error) throw error;

      setGeneratedTests(data.generatedTests);
      setCoverage(data.coverageEstimate);
      toast.success(`Generated ${data.testCount} test cases`);
    } catch (error) {
      console.error('Test generation error:', error);
      toast.error(error instanceof Error ? error.message : "Failed to generate tests");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedTests);
    setCopied(true);
    toast.success("Tests copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="glass-effect border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5" />
          Testing Generator
        </CardTitle>
        <CardDescription>
          Auto-generate comprehensive unit tests for your code
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Test Framework</label>
          <Select value={framework} onValueChange={setFramework}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="jest">Jest</SelectItem>
              <SelectItem value="vitest">Vitest</SelectItem>
              <SelectItem value="mocha">Mocha</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Code to Test</label>
          <Textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Paste your code here..."
            className="min-h-[200px] font-mono text-sm"
          />
        </div>

        <Button 
          onClick={handleGenerate} 
          disabled={loading || !code.trim()}
          className="w-full"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Generate Tests
        </Button>

        {generatedTests && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Badge variant="secondary">
                  Framework: {framework}
                </Badge>
                {coverage && (
                  <Badge variant="default">
                    Estimated Coverage: {coverage}%
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>

            <ScrollArea className="h-[400px] rounded-md border bg-muted/50 p-4">
              <pre className="text-xs">
                <code>{generatedTests}</code>
              </pre>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
};