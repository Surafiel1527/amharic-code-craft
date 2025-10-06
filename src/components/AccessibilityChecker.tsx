import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Shield, CheckCircle, AlertCircle, Info, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { logger } from "@/utils/logger";

interface AccessibilityCheckerProps {
  code: string;
  onCodeFixed?: (fixedCode: string) => void;
}

interface AccessibilityIssue {
  severity: "critical" | "warning" | "info";
  wcagLevel: string;
  criterion: string;
  issue: string;
  element: string;
  recommendation: string;
}

interface AccessibilityReport {
  score: number;
  issues: AccessibilityIssue[];
  summary: string;
}

export const AccessibilityChecker = ({ code, onCodeFixed }: AccessibilityCheckerProps) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [report, setReport] = useState<AccessibilityReport | null>(null);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      // Route to unified-quality for accessibility checking
      const { data, error } = await supabase.functions.invoke('unified-quality', {
        body: { 
          operation: 'accessibility-check',
          code,
          autoFix: false 
        }
      });

      if (error) throw error;
      setReport(data);
      toast.success("የተደራሽነት ትንተና ተጠናቀቀ");
    } catch (error) {
      logger.error('Error analyzing accessibility', error);
      toast.error("ትንተና ማድረግ አልተቻለም");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAutoFix = async () => {
    setIsFixing(true);
    try {
      // Route to unified-quality for auto-fixing accessibility issues
      const { data, error } = await supabase.functions.invoke('unified-quality', {
        body: { 
          operation: 'accessibility-check',
          code,
          autoFix: true 
        }
      });

      if (error) throw error;

      if (data.fixedCode) {
        onCodeFixed?.(data.fixedCode);
        toast.success("የተደራሽነት ችግሮች ተስተካክለዋል!");
        // Re-analyze after fix
        handleAnalyze();
      }
    } catch (error) {
      logger.error('Error fixing accessibility', error);
      toast.error("ችግሮችን ማስተካከል አልተቻለም");
    } finally {
      setIsFixing(false);
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
        return 'default';
      default:
        return 'secondary';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          የተደራሽነት መፈተሻ (WCAG 2.1)
        </CardTitle>
        <CardDescription>
          ኮድዎ ለሁሉም ተጠቃሚዎች ተደራሽ መሆኑን ያረጋግጡ
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
                <Shield className="mr-2 h-4 w-4" />
                ተደራሽነት ተንትን
              </>
            )}
          </Button>
          
          {report && report.issues.length > 0 && (
            <Button
              onClick={handleAutoFix}
              disabled={isFixing}
              className="flex-1"
            >
              {isFixing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  በማስተካከል ላይ...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  በራስ-ሰር አስተካክል
                </>
              )}
            </Button>
          )}
        </div>

        {report && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">የተደራሽነት ነጥብ</span>
                <span className="text-2xl font-bold">{report.score}/100</span>
              </div>
              <Progress value={report.score} className="h-2" />
            </div>

            {report.summary && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm">{report.summary}</p>
              </div>
            )}

            {report.issues.length > 0 ? (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {report.issues.map((issue, index) => (
                    <div
                      key={index}
                      className="p-4 border border-border rounded-lg space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {getSeverityIcon(issue.severity)}
                          <Badge variant={getSeverityColor(issue.severity) as any}>
                            {issue.severity.toUpperCase()}
                          </Badge>
                          <Badge variant="outline">{issue.wcagLevel}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {issue.criterion}
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{issue.issue}</p>
                        <p className="text-xs text-muted-foreground">
                          Element: <code className="px-1 py-0.5 bg-muted rounded">{issue.element}</code>
                        </p>
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
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p className="text-sm font-medium">ምንም የተደራሽነት ችግር አልተገኘም!</p>
                <p className="text-xs text-muted-foreground mt-1">
                  ኮድዎ WCAG 2.1 መስፈርቶችን ያሟላል
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
