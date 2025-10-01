import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2, AlertCircle, Info, Sparkles, Zap } from "lucide-react";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface CodeAnalysisProps {
  code: string;
  projectId?: string;
  onOptimize?: (optimizedCode: string) => void;
}

interface Issue {
  severity: 'critical' | 'warning' | 'info';
  message: string;
  line?: number;
}

interface Suggestion {
  category: string;
  message: string;
  benefit: string;
}

interface Analysis {
  quality_score: number;
  performance_score: number;
  issues: Issue[];
  suggestions: Suggestion[];
}

export const CodeAnalysis = ({ code, projectId, onOptimize }: CodeAnalysisProps) => {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const handleAnalyze = async () => {
    if (!code.trim()) {
      toast.error("ምንም ኮድ የለም");
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-code', {
        body: { code, projectId }
      });

      if (error) throw error;

      setAnalysis(data);

      // Save analysis to database if projectId provided
      if (projectId) {
        await supabase.from('code_analysis').insert({
          project_id: projectId,
          analysis_type: 'quality',
          score: data.quality_score,
          issues: data.issues,
          suggestions: data.suggestions
        });
      }

      toast.success("ትንተና ተጠናቅቋል!");
    } catch (error) {
      console.error('Error analyzing code:', error);
      toast.error("ትንተና አልተሳካም");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleOptimize = async () => {
    if (!code.trim() || !analysis) {
      toast.error("በመጀመሪያ ኮዱን ይተንተኑ");
      return;
    }

    setIsOptimizing(true);
    try {
      const { data, error } = await supabase.functions.invoke('optimize-code', {
        body: { 
          code, 
          issues: analysis.issues.filter(i => i.severity !== 'info')
        }
      });

      if (error) throw error;

      if (onOptimize && data.optimizedCode) {
        onOptimize(data.optimizedCode);
        toast.success("ኮድ ተመሻሽሏል!");
      }
    } catch (error) {
      console.error('Error optimizing code:', error);
      toast.error("ማመቻቸት አልተሳካም");
    } finally {
      setIsOptimizing(false);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'warning':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Card className="glass-effect border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          AI የኮድ ትንተና
        </CardTitle>
        <CardDescription>
          የእርስዎን ኮድ በ AI በመጠቀም ይተንትኑ እና ያሻሽሉ
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !code.trim()}
            className="flex-1"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                በመተንተን ላይ...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                ኮድ ተንትን
              </>
            )}
          </Button>

          {analysis && (
            <Button
              onClick={handleOptimize}
              disabled={isOptimizing || !code.trim()}
              variant="outline"
              className="flex-1"
            >
              {isOptimizing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  በማመቻቸት ላይ...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  በራስ አመቻች
                </>
              )}
            </Button>
          )}
        </div>

        {analysis && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            {/* Scores */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>የጥራት ነጥብ</span>
                  <span className="font-bold">{analysis.quality_score}/100</span>
                </div>
                <Progress value={analysis.quality_score} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>የአፈጻጸም ነጥብ</span>
                  <span className="font-bold">{analysis.performance_score}/100</span>
                </div>
                <Progress value={analysis.performance_score} />
              </div>
            </div>

            {/* Issues */}
            {analysis.issues.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  ጉዳዮች ({analysis.issues.length})
                </h4>
                <div className="space-y-2">
                  {analysis.issues.map((issue, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 p-3 rounded-lg border bg-background/50"
                    >
                      {getSeverityIcon(issue.severity)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={getSeverityColor(issue.severity) as any} className="text-xs">
                            {issue.severity}
                          </Badge>
                          {issue.line && (
                            <span className="text-xs text-muted-foreground">
                              መስመር {issue.line}
                            </span>
                          )}
                        </div>
                        <p className="text-sm">{issue.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions */}
            {analysis.suggestions.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  አስተያየቶች ({analysis.suggestions.length})
                </h4>
                <Accordion type="single" collapsible className="w-full">
                  {analysis.suggestions.map((suggestion, index) => (
                    <AccordionItem key={index} value={`item-${index}`}>
                      <AccordionTrigger className="text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {suggestion.category}
                          </Badge>
                          <span>{suggestion.message}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <p className="text-sm text-muted-foreground">
                            <strong>ጥቅም:</strong> {suggestion.benefit}
                          </p>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
