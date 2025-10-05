import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Brain, CheckCircle2, XCircle, TrendingUp, 
  BookOpen, Lightbulb, AlertCircle 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LearnedPattern {
  id: string;
  provider: string;
  error_pattern: string;
  error_type: string;
  solution: any;
  diagnosis: string;
  success_count: number;
  failure_count: number;
  learned_at: string;
}

export function DeploymentFixLearning() {
  const [learnedPatterns, setLearnedPatterns] = useState<LearnedPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPattern, setSelectedPattern] = useState<LearnedPattern | null>(null);

  useEffect(() => {
    loadLearnedPatterns();
  }, []);

  const loadLearnedPatterns = async () => {
    try {
      const { data, error } = await supabase
        .from('deployment_error_patterns')
        .select('*')
        .order('success_count', { ascending: false })
        .limit(20);

      if (error) throw error;
      setLearnedPatterns(data || []);
    } catch (error) {
      console.error('Failed to load patterns:', error);
      toast.error('Failed to load learned patterns');
    } finally {
      setLoading(false);
    }
  };

  const getSuccessRate = (pattern: LearnedPattern) => {
    const total = pattern.success_count + pattern.failure_count;
    if (total === 0) return 0;
    return Math.round((pattern.success_count / total) * 100);
  };

  return (
    <Card className="p-4 space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">AI Deployment Learning</h3>
        </div>
        <Badge variant="outline">
          {learnedPatterns.length} Patterns Learned
        </Badge>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
          Loading learned patterns...
        </div>
      ) : learnedPatterns.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 p-6">
          <BookOpen className="w-12 h-12 opacity-50" />
          <p className="text-sm text-muted-foreground">
            No deployment errors learned yet
          </p>
          <p className="text-xs text-muted-foreground">
            When you report deployment errors, the AI will learn how to fix them automatically
          </p>
        </div>
      ) : (
        <div className="flex-1 flex gap-4">
          {/* Patterns List */}
          <ScrollArea className="flex-1">
            <div className="space-y-2 pr-4">
              {learnedPatterns.map((pattern) => (
                <Card
                  key={pattern.id}
                  className={`p-3 cursor-pointer transition-colors ${
                    selectedPattern?.id === pattern.id 
                      ? 'border-primary bg-primary/5' 
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedPattern(pattern)}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {pattern.provider}
                      </Badge>
                      <div className="flex items-center gap-1">
                        {getSuccessRate(pattern) >= 70 ? (
                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                        ) : getSuccessRate(pattern) >= 40 ? (
                          <AlertCircle className="w-3 h-3 text-yellow-500" />
                        ) : (
                          <XCircle className="w-3 h-3 text-red-500" />
                        )}
                        <span className="text-xs text-muted-foreground">
                          {getSuccessRate(pattern)}%
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-sm font-medium line-clamp-2">
                      {pattern.error_type}
                    </p>
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <TrendingUp className="w-3 h-3" />
                      <span>
                        {pattern.success_count} successful fixes
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>

          {/* Pattern Details */}
          {selectedPattern && (
            <Card className="w-1/2 p-4 space-y-4">
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  Fix Details
                </h4>
                
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Diagnosis:</p>
                    <p className="text-sm">{selectedPattern.diagnosis}</p>
                  </div>

                  {selectedPattern.solution?.files && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Files to Modify:</p>
                      <div className="space-y-1">
                        {selectedPattern.solution.files.map((file: any, idx: number) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {file.path}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedPattern.solution?.steps && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Solution Steps:</p>
                      <ol className="list-decimal list-inside space-y-1">
                        {selectedPattern.solution.steps.map((step: string, idx: number) => (
                          <li key={idx} className="text-xs">{step}</li>
                        ))}
                      </ol>
                    </div>
                  )}

                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground">
                      Learned: {new Date(selectedPattern.learned_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      <div className="pt-2 border-t text-xs text-muted-foreground">
        💡 The AI learns from every deployment error and improves its fixes over time
      </div>
    </Card>
  );
}
