import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Wrench, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Code,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Issue {
  line: number;
  severity: string;
  message: string;
  rule?: string;
}

interface FixSuggestion {
  issue: Issue;
  fixedCode: string;
  explanation: string;
  confidence: number;
  fromPattern: boolean;
  id?: string;
}

interface AutoFixEngineProps {
  code: string;
  language: string;
  issues: Issue[];
  validationResultId?: string;
  onFixApplied?: (fixedCode: string) => void;
}

export const AutoFixEngine = ({ 
  code, 
  language, 
  issues,
  validationResultId,
  onFixApplied 
}: AutoFixEngineProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [fixes, setFixes] = useState<FixSuggestion[]>([]);
  const [selectedFix, setSelectedFix] = useState<number>(0);
  const { toast } = useToast();

  const generateFixes = async () => {
    if (!code || issues.length === 0) return;

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('auto-fix-engine', {
        body: {
          code,
          language,
          issues,
          validationResultId
        }
      });

      if (error) throw error;

      if (data.success) {
        setFixes(data.fixes);
        
        toast({
          title: "Fixes Generated",
          description: `${data.fixes.length} fix suggestion(s) created`,
        });
      }
    } catch (error) {
      console.error('Auto-fix generation failed:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate fixes",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const applyFix = async (fix: FixSuggestion, index: number) => {
    if (onFixApplied) {
      onFixApplied(fix.fixedCode);
    }

    // Mark as applied in database
    if (fix.id) {
      await supabase
        .from('auto_fix_suggestions')
        .update({ 
          applied: true,
          applied_at: new Date().toISOString()
        })
        .eq('id', fix.id);
    }

    toast({
      title: "Fix Applied",
      description: `${fix.issue.message} has been fixed`,
    });
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-500';
    if (confidence >= 0.6) return 'text-yellow-500';
    return 'text-orange-500';
  };

  if (issues.length === 0) {
    return (
      <Card className="border-green-500/20 bg-gradient-to-br from-background to-green-500/5">
        <CardContent className="flex items-center justify-center p-6">
          <div className="text-center space-y-2">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
            <p className="font-medium">No Issues Found</p>
            <p className="text-sm text-muted-foreground">Your code looks great!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wrench className="h-5 w-5 text-primary" />
            Auto-Fix Engine
            <Badge variant="outline" className="ml-2">
              {issues.length} Issue{issues.length !== 1 ? 's' : ''}
            </Badge>
          </CardTitle>

          {fixes.length > 0 && (
            <Badge variant="default">
              {fixes.filter(f => f.fromPattern).length} from patterns
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {fixes.length === 0 ? (
          <>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Found {issues.length} issue(s) that can be automatically fixed
              </p>
              <div className="space-y-2">
                {issues.map((issue, index) => (
                  <div 
                    key={index}
                    className="flex items-start gap-2 p-2 rounded-lg border bg-card"
                  >
                    <AlertCircle className={`h-4 w-4 mt-0.5 ${
                      issue.severity === 'error' ? 'text-destructive' : 'text-yellow-500'
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Line {issue.line}</p>
                      <p className="text-xs text-muted-foreground">{issue.message}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {issue.severity}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <Button 
              onClick={generateFixes}
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Fixes...
                </>
              ) : (
                <>
                  <Wrench className="h-4 w-4 mr-2" />
                  Generate Auto-Fixes
                </>
              )}
            </Button>
          </>
        ) : (
          <Tabs value={selectedFix.toString()} onValueChange={(v) => setSelectedFix(parseInt(v))}>
            <TabsList className="w-full justify-start overflow-x-auto">
              {fixes.map((fix, index) => (
                <TabsTrigger key={index} value={index.toString()} className="flex-shrink-0">
                  Fix {index + 1}
                  {fix.fromPattern && (
                    <Sparkles className="h-3 w-3 ml-1 text-yellow-500" />
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            {fixes.map((fix, index) => (
              <TabsContent key={index} value={index.toString()} className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Issue: {fix.issue.message}</p>
                      <p className="text-sm text-muted-foreground">Line {fix.issue.line}</p>
                    </div>
                    <Badge variant="secondary" className={getConfidenceColor(fix.confidence)}>
                      {(fix.confidence * 100).toFixed(0)}% confidence
                    </Badge>
                  </div>

                  {fix.fromPattern && (
                    <Badge variant="outline" className="flex items-center gap-1 w-fit">
                      <Sparkles className="h-3 w-3" />
                      Using learned pattern
                    </Badge>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Explanation:</p>
                  <p className="text-sm text-muted-foreground">{fix.explanation}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Original Code:</p>
                    <ScrollArea className="h-[200px] w-full rounded-md border bg-muted/50 p-3">
                      <pre className="text-xs font-mono whitespace-pre-wrap">{code}</pre>
                    </ScrollArea>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2 flex items-center gap-2">
                      Fixed Code:
                      <ArrowRight className="h-4 w-4 text-green-500" />
                    </p>
                    <ScrollArea className="h-[200px] w-full rounded-md border bg-green-500/10 p-3">
                      <pre className="text-xs font-mono whitespace-pre-wrap">{fix.fixedCode}</pre>
                    </ScrollArea>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={() => applyFix(fix, index)}
                    className="flex-1"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Apply This Fix
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => navigator.clipboard.writeText(fix.fixedCode)}
                  >
                    <Code className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};
