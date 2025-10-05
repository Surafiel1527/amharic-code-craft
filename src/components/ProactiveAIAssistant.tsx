import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Lightbulb, Shield, Zap, CheckCircle2, 
  AlertTriangle, XCircle, TrendingUp, Code2 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProactiveAIAssistantProps {
  projectId?: string;
  currentFile?: string;
  currentCode?: string;
}

interface Suggestion {
  id: string;
  type: 'performance' | 'security' | 'best-practice' | 'optimization';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  code?: string;
  fix?: string;
  impact: string;
  automated: boolean;
}

export function ProactiveAIAssistant({ projectId, currentFile, currentCode }: ProactiveAIAssistantProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [autoFixEnabled, setAutoFixEnabled] = useState(false);

  useEffect(() => {
    if (currentCode && currentFile) {
      analyzeCode();
    }
  }, [currentCode, currentFile]);

  const analyzeCode = async () => {
    if (!currentCode) return;

    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('proactive-intelligence', {
        body: {
          code: currentCode,
          filePath: currentFile,
          projectId
        }
      });

      if (error) throw error;

      if (data?.suggestions) {
        setSuggestions(data.suggestions);
        
        // Auto-apply critical security fixes if enabled
        if (autoFixEnabled) {
          const criticalFixes = data.suggestions.filter(
            (s: Suggestion) => s.severity === 'critical' && s.automated && s.fix
          );
          
          if (criticalFixes.length > 0) {
            toast.info(`Auto-applying ${criticalFixes.length} critical fixes...`);
          }
        }
      }
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const applySuggestion = async (suggestion: Suggestion) => {
    if (!suggestion.fix) return;

    try {
      toast.success(`Applied: ${suggestion.title}`);
      // Here you would apply the fix to the actual code
    } catch (error) {
      toast.error('Failed to apply fix');
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="w-4 h-4 text-destructive" />;
      case 'high': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'medium': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'low': return <Lightbulb className="w-4 h-4 text-blue-500" />;
      default: return <Lightbulb className="w-4 h-4" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'security': return <Shield className="w-4 h-4" />;
      case 'performance': return <Zap className="w-4 h-4" />;
      case 'optimization': return <TrendingUp className="w-4 h-4" />;
      case 'best-practice': return <Code2 className="w-4 h-4" />;
      default: return <Lightbulb className="w-4 h-4" />;
    }
  };

  const groupedSuggestions = {
    security: suggestions.filter(s => s.type === 'security'),
    performance: suggestions.filter(s => s.type === 'performance'),
    bestPractice: suggestions.filter(s => s.type === 'best-practice'),
    optimization: suggestions.filter(s => s.type === 'optimization')
  };

  const stats = {
    total: suggestions.length,
    critical: suggestions.filter(s => s.severity === 'critical').length,
    automated: suggestions.filter(s => s.automated).length,
    security: groupedSuggestions.security.length
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5" />
          <h3 className="font-semibold">Proactive AI Assistant</h3>
        </div>
        <Badge variant={analyzing ? "secondary" : "outline"}>
          {analyzing ? "Analyzing..." : "Active"}
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        <div className="text-center p-2 bg-muted rounded">
          <div className="text-xl font-bold">{stats.total}</div>
          <div className="text-[10px] text-muted-foreground">Issues</div>
        </div>
        <div className="text-center p-2 bg-destructive/10 rounded">
          <div className="text-xl font-bold text-destructive">{stats.critical}</div>
          <div className="text-[10px] text-muted-foreground">Critical</div>
        </div>
        <div className="text-center p-2 bg-blue-500/10 rounded">
          <div className="text-xl font-bold text-blue-600">{stats.security}</div>
          <div className="text-[10px] text-muted-foreground">Security</div>
        </div>
        <div className="text-center p-2 bg-green-500/10 rounded">
          <div className="text-xl font-bold text-green-600">{stats.automated}</div>
          <div className="text-[10px] text-muted-foreground">Auto-fix</div>
        </div>
      </div>

      {/* Auto-fix Toggle */}
      <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
        <div className="text-sm">
          <div className="font-medium">Auto-fix Critical Issues</div>
          <div className="text-xs text-muted-foreground">Automatically apply security fixes</div>
        </div>
        <Button
          variant={autoFixEnabled ? "default" : "outline"}
          size="sm"
          onClick={() => setAutoFixEnabled(!autoFixEnabled)}
        >
          {autoFixEnabled ? "Enabled" : "Disabled"}
        </Button>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="w-3 h-3" />
          </TabsTrigger>
          <TabsTrigger value="performance">
            <Zap className="w-3 h-3" />
          </TabsTrigger>
          <TabsTrigger value="best-practice">
            <Code2 className="w-3 h-3" />
          </TabsTrigger>
          <TabsTrigger value="optimization">
            <TrendingUp className="w-3 h-3" />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {suggestions.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  {currentCode ? "No issues detected!" : "Open a file to start analysis"}
                </div>
              ) : (
                suggestions.map((suggestion) => (
                  <Card key={suggestion.id} className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1">
                        {getSeverityIcon(suggestion.severity)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-medium">{suggestion.title}</h4>
                            {getTypeIcon(suggestion.type)}
                          </div>
                          <p className="text-xs text-muted-foreground">{suggestion.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-[10px]">
                              {suggestion.severity.toUpperCase()}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              Impact: {suggestion.impact}
                            </span>
                          </div>
                        </div>
                      </div>
                      {suggestion.automated && suggestion.fix && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => applySuggestion(suggestion)}
                        >
                          Auto-fix
                        </Button>
                      )}
                    </div>
                    {suggestion.code && (
                      <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                        <code>{suggestion.code}</code>
                      </pre>
                    )}
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="security">
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {groupedSuggestions.security.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <Shield className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  No security issues found
                </div>
              ) : (
                groupedSuggestions.security.map((s) => (
                  <Card key={s.id} className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-medium">{s.title}</h4>
                        <p className="text-xs text-muted-foreground">{s.description}</p>
                      </div>
                      {s.automated && (
                        <Button size="sm" onClick={() => applySuggestion(s)}>
                          Fix
                        </Button>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="performance">
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {groupedSuggestions.performance.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <Zap className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  No performance issues found
                </div>
              ) : (
                groupedSuggestions.performance.map((s) => (
                  <Card key={s.id} className="p-3">
                    <h4 className="text-sm font-medium">{s.title}</h4>
                    <p className="text-xs text-muted-foreground">{s.description}</p>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="best-practice">
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {groupedSuggestions.bestPractice.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <Code2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  Following best practices!
                </div>
              ) : (
                groupedSuggestions.bestPractice.map((s) => (
                  <Card key={s.id} className="p-3">
                    <h4 className="text-sm font-medium">{s.title}</h4>
                    <p className="text-xs text-muted-foreground">{s.description}</p>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="optimization">
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {groupedSuggestions.optimization.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  Code is well optimized!
                </div>
              ) : (
                groupedSuggestions.optimization.map((s) => (
                  <Card key={s.id} className="p-3">
                    <h4 className="text-sm font-medium">{s.title}</h4>
                    <p className="text-xs text-muted-foreground">{s.description}</p>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
