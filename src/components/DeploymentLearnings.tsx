import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, TrendingUp, Lightbulb, CheckCircle2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";

interface Learning {
  id: string;
  pattern_name: string;
  pattern_type: string;
  learned_from_deployments: number;
  confidence_score: number;
  recommendation: string;
  impact_score: number;
  times_applied: number;
  success_rate: number;
}

export const DeploymentLearnings = () => {
  const { data: learnings, isLoading } = useQuery({
    queryKey: ['deployment-learnings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deployment_learnings' as any)
        .select('*')
        .order('confidence_score', { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data as any) as Learning[];
    },
  });

  const getPatternIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />;
      case 'best_practice': return <Lightbulb className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />;
      case 'optimization': return <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
      default: return <Brain className="h-5 w-5 text-primary" />;
    }
  };

  const getPatternBadge = (type: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      success: 'default',
      best_practice: 'secondary',
      optimization: 'outline',
      failure: 'destructive',
    };
    return variants[type] || 'outline';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Brain className="h-6 w-6 animate-pulse text-primary mr-2" />
          <p className="text-muted-foreground">Loading AI learnings...</p>
        </CardContent>
      </Card>
    );
  }

  if (!learnings || learnings.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Brain className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
          <p className="text-lg font-medium">No Learnings Yet</p>
          <p className="text-sm text-muted-foreground">AI will learn from deployments and suggest improvements</p>
        </CardContent>
      </Card>
    );
  }

  const topLearnings = learnings.slice(0, 5);
  const avgConfidence = learnings.reduce((sum, l) => sum + l.confidence_score, 0) / learnings.length;

  return (
    <div className="space-y-4">
      {/* Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Total Learnings</p>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </div>
            <h3 className="text-3xl font-bold">{learnings.length}</h3>
            <p className="text-xs text-muted-foreground mt-1">Patterns discovered</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Avg Confidence</p>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <h3 className="text-3xl font-bold">{avgConfidence.toFixed(0)}%</h3>
            <Progress value={avgConfidence} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Applied</p>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </div>
            <h3 className="text-3xl font-bold">
              {learnings.reduce((sum, l) => sum + l.times_applied, 0)}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">Times used</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Learnings */}
      <Card>
        <CardHeader>
          <CardTitle>Top AI Learnings</CardTitle>
          <CardDescription>
            Best practices and optimizations learned from deployments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topLearnings.map((learning, index) => (
              <div key={learning.id} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                      {index + 1}
                    </div>
                    {getPatternIcon(learning.pattern_type)}
                    <div>
                      <p className="font-medium">{learning.pattern_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={getPatternBadge(learning.pattern_type)} className="text-xs">
                          {learning.pattern_type.replace('_', ' ')}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Applied {learning.times_applied}x
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{learning.confidence_score}%</p>
                    <p className="text-xs text-muted-foreground">Confidence</p>
                  </div>
                </div>

                <div className="pl-11">
                  <p className="text-sm text-muted-foreground">{learning.recommendation}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span>From {learning.learned_from_deployments} deployments</span>
                    {learning.success_rate > 0 && (
                      <span className="text-green-600 dark:text-green-400">
                        {learning.success_rate}% success rate
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
