import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, TrendingUp, AlertCircle, Wand2, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SEOOptimizerProps {
  code: string;
  onCodeOptimized?: (optimizedCode: string) => void;
}

interface SEOIssue {
  category: string;
  severity: "critical" | "warning" | "info";
  issue: string;
  recommendation: string;
  priority: string;
}

interface SEOReport {
  score: number;
  issues: SEOIssue[];
  suggestions: {
    title?: string;
    description?: string;
    structuredData?: string;
  };
  summary: string;
}

export const SEOOptimizer = ({ code, onCodeOptimized }: SEOOptimizerProps) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [report, setReport] = useState<SEOReport | null>(null);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('seo-analyze', {
        body: { code, optimize: false }
      });

      if (error) throw error;
      setReport(data);
      toast.success("SEO ትንተና ተጠናቀቀ");
    } catch (error) {
      console.error('Error analyzing SEO:', error);
      toast.error("SEO ትንተና ማድረግ አልተቻለም");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleOptimize = async () => {
    setIsOptimizing(true);
    try {
      const { data, error } = await supabase.functions.invoke('seo-analyze', {
        body: { code, optimize: true }
      });

      if (error) throw error;

      if (data.optimizedCode) {
        onCodeOptimized?.(data.optimizedCode);
        toast.success("ኮድ ለ SEO ተመቻች!");
        // Re-analyze after optimization
        handleAnalyze();
      }
    } catch (error) {
      console.error('Error optimizing SEO:', error);
      toast.error("SEO ማሻሻል አልተቻለም");
    } finally {
      setIsOptimizing(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'warning':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-500';
      case 'medium':
        return 'text-yellow-500';
      default:
        return 'text-blue-500';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          SEO መመቻቻ
        </CardTitle>
        <CardDescription>
          ድህረ ገፅዎ በፍለጋ ሞተሮች ላይ በደንብ እንዲታይ ያስፈቅዱ
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !code}
            variant="outline"
            className="flex-1"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                በመተንተን ላይ...
              </>
            ) : (
              <>
                <TrendingUp className="mr-2 h-4 w-4" />
                SEO ተንትን
              </>
            )}
          </Button>
          
          {report && report.issues.length > 0 && (
            <Button
              onClick={handleOptimize}
              disabled={isOptimizing}
              className="flex-1"
            >
              {isOptimizing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  በማሻሻል ላይ...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  በራስ-ሰር አሻሽል
                </>
              )}
            </Button>
          )}
        </div>

        {report && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">SEO ነጥብ</span>
                <span className="text-2xl font-bold">{report.score}/100</span>
              </div>
              <Progress value={report.score} className="h-2" />
            </div>

            {report.summary && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm">{report.summary}</p>
              </div>
            )}

            <Tabs defaultValue="issues" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="issues">ችግሮች</TabsTrigger>
                <TabsTrigger value="suggestions">ጥቆማዎች</TabsTrigger>
              </TabsList>

              <TabsContent value="issues" className="mt-4">
                {report.issues.length > 0 ? (
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-3">
                      {report.issues.map((issue, index) => (
                        <div
                          key={index}
                          className="p-4 border border-border rounded-lg space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <AlertCircle className="h-4 w-4" />
                              <Badge variant={getSeverityColor(issue.severity) as any}>
                                {issue.severity}
                              </Badge>
                              <Badge variant="outline">{issue.category}</Badge>
                              <span className={`text-xs font-medium ${getPriorityColor(issue.priority)}`}>
                                {issue.priority} priority
                              </span>
                            </div>
                          </div>
                          
                          <div className="space-y-1">
                            <p className="text-sm font-medium">{issue.issue}</p>
                            <p className="text-sm text-muted-foreground">
                              💡 {issue.recommendation}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p className="text-sm font-medium">SEO ጥሩ ነው!</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="suggestions" className="mt-4">
                <div className="space-y-4">
                  {report.suggestions.title && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm font-medium">የጭንቅላት መለያ</span>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <code className="text-xs">{report.suggestions.title}</code>
                      </div>
                    </div>
                  )}

                  {report.suggestions.description && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm font-medium">መግለጫ</span>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <code className="text-xs">{report.suggestions.description}</code>
                      </div>
                    </div>
                  )}

                  {report.suggestions.structuredData && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm font-medium">Structured Data</span>
                      </div>
                      <ScrollArea className="h-[200px]">
                        <pre className="p-3 bg-muted rounded-lg text-xs overflow-x-auto">
                          {report.suggestions.structuredData}
                        </pre>
                      </ScrollArea>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
