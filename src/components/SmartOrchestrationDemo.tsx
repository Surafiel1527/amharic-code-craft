import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Zap, 
  Loader2, 
  CheckCircle2,
  TrendingUp,
  Sparkles
} from "lucide-react";

export const SmartOrchestrationDemo = () => {
  const [loading, setLoading] = useState(false);
  const [userRequest, setUserRequest] = useState('');
  const [autoRefine, setAutoRefine] = useState(true);
  const [autoLearn, setAutoLearn] = useState(true);
  const [results, setResults] = useState<any>(null);
  const [progress, setProgress] = useState(0);

  const runOrchestration = async () => {
    if (!userRequest.trim()) {
      toast.error('Please enter a request');
      return;
    }

    setLoading(true);
    setProgress(0);
    setResults(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error('Please login first');
        return;
      }

      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 5, 90));
      }, 500);

      const { data, error } = await supabase.functions.invoke('smart-orchestrator', {
        body: {
          userRequest,
          conversationId: 'demo-' + Date.now(),
          currentCode: '',
          autoRefine,
          autoLearn
        }
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (error) throw error;

      setResults(data);
      
      const phasesCount = data.phases.length;
      const totalTime = (data.totalDuration / 1000).toFixed(2);
      
      toast.success(`✨ Orchestration complete! ${phasesCount} phases in ${totalTime}s`);

    } catch (error: any) {
      console.error('Orchestration error:', error);
      toast.error('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          <CardTitle>Smart Orchestration System</CardTitle>
        </div>
        <CardDescription>
          Fully automated AI workflow: Plan → Analyze → Generate → Refine → Learn
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Input Section */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="request">Describe what you want to build</Label>
            <Textarea
              id="request"
              value={userRequest}
              onChange={(e) => setUserRequest(e.target.value)}
              placeholder="Example: Create a user dashboard with authentication, data tables, and analytics charts"
              className="mt-2 min-h-[100px]"
              disabled={loading}
            />
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center space-x-2">
              <Switch
                id="auto-refine"
                checked={autoRefine}
                onCheckedChange={setAutoRefine}
                disabled={loading}
              />
              <Label htmlFor="auto-refine">Auto-Refine Code</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="auto-learn"
                checked={autoLearn}
                onCheckedChange={setAutoLearn}
                disabled={loading}
              />
              <Label htmlFor="auto-learn">Auto-Learn Patterns</Label>
            </div>
          </div>

          <Button 
            onClick={runOrchestration} 
            disabled={loading || !userRequest.trim()}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5 mr-2" />
                Run Smart Orchestration
              </>
            )}
          </Button>

          {loading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Processing phases...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </div>

        {/* Results Section */}
        {results && (
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Orchestration Complete</h3>
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Success
              </Badge>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary">
                      {results.phases.length}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Phases Completed
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">
                      {(results.totalDuration / 1000).toFixed(1)}s
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Total Duration
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {results.qualityMetrics?.finalScore || 'N/A'}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Quality Score
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Phases Timeline */}
            <div className="space-y-2">
              <h4 className="font-semibold">Execution Timeline</h4>
              <div className="space-y-2">
                {results.phases.map((phase: any, idx: number) => (
                  <div 
                    key={idx} 
                    className="flex items-center gap-3 p-3 bg-muted rounded-lg"
                  >
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium capitalize">
                          {phase.name.replace(/_/g, ' ')}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {phase.duration}ms
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Suggested Patterns */}
            {results.suggestedPatterns && results.suggestedPatterns.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold">Applied Patterns</h4>
                <div className="flex flex-wrap gap-2">
                  {results.suggestedPatterns.slice(0, 5).map((pattern: any, idx: number) => (
                    <Badge key={idx} variant="secondary">
                      {pattern.pattern_name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Quality Metrics */}
            {results.qualityMetrics && (
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Quality Improvement
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">Initial Score</div>
                    <div className="text-2xl font-bold">
                      {results.qualityMetrics.initialScore}
                    </div>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">Final Score</div>
                    <div className="text-2xl font-bold text-green-600">
                      {results.qualityMetrics.finalScore}
                    </div>
                  </div>
                </div>
                {results.qualityMetrics.improvement > 0 && (
                  <Badge variant="default" className="w-full justify-center">
                    +{results.qualityMetrics.improvement} points improvement
                  </Badge>
                )}
              </div>
            )}
          </div>
        )}

        {/* Info Box */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg space-y-2">
          <h4 className="font-semibold text-sm">How It Works:</h4>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Plans architecture before generation</li>
            <li>Analyzes component dependencies for safe changes</li>
            <li>Suggests reusable patterns from your history</li>
            <li>Automatically refines code quality</li>
            <li>Learns successful patterns for future use</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};