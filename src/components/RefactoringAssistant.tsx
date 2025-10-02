import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Loader2, TrendingDown, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RefactoringAssistantProps {
  code?: string;
  componentName?: string;
  projectId?: string;
}

export const RefactoringAssistant = ({ 
  code: initialCode = "", 
  componentName: initialName = "",
  projectId 
}: RefactoringAssistantProps) => {
  const [code, setCode] = useState(initialCode);
  const [componentName, setComponentName] = useState(initialName);
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<any>(null);
  const [improvements, setImprovements] = useState<string[]>([]);

  const handleAnalyze = async () => {
    if (!code.trim() || !componentName.trim()) {
      toast.error("Please provide both code and component name");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-refactoring', {
        body: { code, componentName, projectId }
      });

      if (error) throw error;

      setSuggestion(data.suggestion);
      setImprovements(data.improvements || []);
      toast.success("Refactoring suggestions generated");
    } catch (error) {
      console.error('Refactoring error:', error);
      toast.error(error instanceof Error ? error.message : "Failed to analyze code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="glass-effect border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Smart Refactoring
        </CardTitle>
        <CardDescription>
          Get AI-powered suggestions to improve your code structure
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="Component name (e.g., UserProfile)"
          value={componentName}
          onChange={(e) => setComponentName(e.target.value)}
        />

        <Textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Paste your code here..."
          className="min-h-[200px] font-mono text-sm"
        />

        <Button 
          onClick={handleAnalyze} 
          disabled={loading || !code.trim() || !componentName.trim()}
          className="w-full"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Analyze & Suggest
        </Button>

        {suggestion && (
          <Tabs defaultValue="suggestions" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="suggestions">Improvements</TabsTrigger>
              <TabsTrigger value="comparison">Comparison</TabsTrigger>
              <TabsTrigger value="refactored">Refactored Code</TabsTrigger>
            </TabsList>

            <TabsContent value="suggestions" className="space-y-3">
              <div className="flex gap-2 mb-3">
                <Badge variant="outline">
                  <TrendingDown className="mr-1 h-3 w-3" />
                  Complexity: {suggestion.complexity_before} → {suggestion.complexity_after}
                </Badge>
                <Badge variant="default">
                  Confidence: {Math.round((suggestion.confidence_score || 0) * 100)}%
                </Badge>
              </div>

              <div className="space-y-2">
                {improvements.map((improvement, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                    <Lightbulb className="h-4 w-4 mt-1 text-primary shrink-0" />
                    <p className="text-sm">{improvement}</p>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-semibold mb-2 text-sm">Reasoning:</h4>
                <p className="text-sm text-muted-foreground">{suggestion.reasoning}</p>
              </div>
            </TabsContent>

            <TabsContent value="comparison">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2 text-sm">Before</h4>
                  <ScrollArea className="h-[300px] rounded-md border bg-muted/50 p-3">
                    <pre className="text-xs">
                      <code>{suggestion.original_code}</code>
                    </pre>
                  </ScrollArea>
                </div>
                <div>
                  <h4 className="font-semibold mb-2 text-sm">After</h4>
                  <ScrollArea className="h-[300px] rounded-md border bg-muted/50 p-3">
                    <pre className="text-xs">
                      <code>{suggestion.suggested_code}</code>
                    </pre>
                  </ScrollArea>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="refactored">
              <ScrollArea className="h-[400px] rounded-md border bg-muted/50 p-4">
                <pre className="text-xs">
                  <code>{suggestion.suggested_code}</code>
                </pre>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};