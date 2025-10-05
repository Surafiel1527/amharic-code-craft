import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Brain, FileText, Package, TrendingUp, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

export const UniversalErrorLearningDashboard = () => {
  const [errorMessage, setErrorMessage] = useState("");
  const [errorContext, setErrorContext] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const { toast } = useToast();

  const analyzeError = async () => {
    if (!errorMessage.trim()) {
      toast({
        title: "Error Required",
        description: "Please provide an error message to analyze",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('universal-error-teacher', {
        body: {
          errorMessage,
          errorContext: errorContext ? JSON.parse(errorContext) : {},
          projectContext: {
            framework: 'react',
            typescript: true,
            vite: true
          }
        }
      });

      if (error) throw error;

      setAnalysisResult(data);
      
      toast({
        title: data.isKnown ? "Known Error Pattern" : "New Learning Created",
        description: data.message,
      });
    } catch (error) {
      console.error('Error analyzing:', error);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Failed to analyze error",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      deployment: 'bg-purple-500',
      runtime: 'bg-red-500',
      typescript: 'bg-blue-500',
      api: 'bg-green-500',
      database: 'bg-yellow-500',
      build: 'bg-orange-500',
      ui: 'bg-pink-500',
      performance: 'bg-indigo-500'
    };
    return colors[category] || 'bg-gray-500';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Brain className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Universal Error Learning System</h1>
          <p className="text-muted-foreground">AI-powered error analysis with documentation reading</p>
        </div>
      </div>

      <Tabs defaultValue="analyze" className="space-y-4">
        <TabsList>
          <TabsTrigger value="analyze">
            <AlertCircle className="w-4 h-4 mr-2" />
            Analyze Error
          </TabsTrigger>
          <TabsTrigger value="documentation">
            <FileText className="w-4 h-4 mr-2" />
            Documentation Cache
          </TabsTrigger>
          <TabsTrigger value="dependencies">
            <Package className="w-4 h-4 mr-2" />
            Dependency Intelligence
          </TabsTrigger>
          <TabsTrigger value="patterns">
            <TrendingUp className="w-4 h-4 mr-2" />
            Learned Patterns
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analyze" className="space-y-4">
          <Card className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Error Message</label>
              <Textarea
                placeholder="Paste your error message here (e.g., Vercel deployment error, Firebase error code, npm install failure, etc.)"
                value={errorMessage}
                onChange={(e) => setErrorMessage(e.target.value)}
                rows={4}
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Error Context (JSON - Optional)</label>
              <Textarea
                placeholder='{"stackTrace": "...", "environment": "production", "timestamp": "..."}'
                value={errorContext}
                onChange={(e) => setErrorContext(e.target.value)}
                rows={3}
                className="font-mono text-sm"
              />
            </div>

            <Button 
              onClick={analyzeError} 
              disabled={isAnalyzing}
              className="w-full"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing with AI...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  Analyze & Learn
                </>
              )}
            </Button>
          </Card>

          {analysisResult && (
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">Analysis Result</h3>
                <div className="flex items-center gap-2">
                  <Badge className={getCategoryColor(analysisResult.category)}>
                    {analysisResult.category}
                  </Badge>
                  {analysisResult.isKnown && (
                    <Badge variant="outline">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Known Pattern
                    </Badge>
                  )}
                  <Badge variant="secondary">
                    {Math.round(analysisResult.confidence * 100)}% Confidence
                  </Badge>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground mb-1">Diagnosis</h4>
                  <p className="text-sm">{analysisResult.diagnosis}</p>
                </div>

                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground mb-1">Root Cause</h4>
                  <p className="text-sm">{analysisResult.rootCause}</p>
                </div>

                {analysisResult.solution && (
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground mb-2">Solution Steps</h4>
                    <div className="space-y-2">
                      {analysisResult.solution.steps?.map((step: string, index: number) => (
                        <div key={index} className="flex items-start gap-2">
                          <span className="text-primary font-bold">{index + 1}.</span>
                          <span className="text-sm">{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {analysisResult.preventionTips && analysisResult.preventionTips.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground mb-2">Prevention Tips</h4>
                    <ul className="space-y-1">
                      {analysisResult.preventionTips.map((tip: string, index: number) => (
                        <li key={index} className="text-sm flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="documentation">
          <Card className="p-6">
            <p className="text-muted-foreground">
              Documentation cache viewer coming soon. This will show cached documentation from Vercel, Firebase, npm, etc.
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="dependencies">
          <Card className="p-6">
            <p className="text-muted-foreground">
              Dependency intelligence viewer coming soon. This will show patterns of successful package installations.
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="patterns">
          <Card className="p-6">
            <p className="text-muted-foreground">
              Learned patterns viewer coming soon. This will show all error patterns the system has learned to fix.
            </p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
