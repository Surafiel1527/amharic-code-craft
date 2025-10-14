import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, Loader2, TrendingUp } from "lucide-react";

export function ABTestingDashboard() {
  const { data: experiments, isLoading } = useQuery({
    queryKey: ['fix-experiments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fix_experiments')
        .select(`
          *,
          error_pattern:universal_error_patterns(
            error_signature,
            fix_strategy
          )
        `)
        .order('started_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 10000 // Refresh every 10 seconds
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const runningExperiments = experiments?.filter(e => e.experiment_status === 'running') || [];
  const completedExperiments = experiments?.filter(e => e.experiment_status === 'completed') || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">A/B Testing Dashboard</h2>
        <p className="text-muted-foreground">
          Continuous experimentation to find the best auto-fix strategies
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Running Experiments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{runningExperiments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{completedExperiments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Sample Size</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {experiments?.reduce((sum, e) => sum + (e.sample_size || 0), 0) || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Running Experiments</h3>
        {runningExperiments.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No active A/B tests running
            </CardContent>
          </Card>
        ) : (
          runningExperiments.map((experiment) => (
            <Card key={experiment.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {(experiment.error_pattern as any)?.error_signature || 'Unknown Pattern'}
                    </CardTitle>
                    <CardDescription>
                      Started {new Date(experiment.started_at).toLocaleString()}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    Running
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="mb-2 text-sm font-medium">Sample Size: {experiment.sample_size || 0}</div>
                  <Progress value={Math.min(100, ((experiment.sample_size || 0) / 30) * 100)} />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Need 30+ samples for statistical significance
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Variant A</span>
                      <span className="text-2xl font-bold">
                        {experiment.variant_a_success_rate?.toFixed(1) || 0}%
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span>{experiment.variant_a_success_count || 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span>{experiment.variant_a_failure_count || 0}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Variant B</span>
                      <span className="text-2xl font-bold">
                        {experiment.variant_b_success_rate?.toFixed(1) || 0}%
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span>{experiment.variant_b_success_count || 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span>{experiment.variant_b_failure_count || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Completed Experiments</h3>
        {completedExperiments.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No completed experiments yet
            </CardContent>
          </Card>
        ) : (
          completedExperiments.map((experiment) => (
            <Card key={experiment.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {(experiment.error_pattern as any)?.error_signature || 'Unknown Pattern'}
                    </CardTitle>
                    <CardDescription>
                      Concluded {new Date(experiment.concluded_at).toLocaleString()}
                    </CardDescription>
                  </div>
                  <Badge variant="default" className="gap-1">
                    <TrendingUp className="h-3 w-3" />
                    Winner: Variant {experiment.winning_variant}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className={`rounded-lg border p-3 ${experiment.winning_variant === 'A' ? 'border-green-500 bg-green-50 dark:bg-green-950' : ''}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Variant A</span>
                      <span className="text-xl font-bold">
                        {experiment.variant_a_success_rate?.toFixed(1) || 0}%
                      </span>
                    </div>
                  </div>

                  <div className={`rounded-lg border p-3 ${experiment.winning_variant === 'B' ? 'border-green-500 bg-green-50 dark:bg-green-950' : ''}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Variant B</span>
                      <span className="text-xl font-bold">
                        {experiment.variant_b_success_rate?.toFixed(1) || 0}%
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Confidence: {experiment.confidence_level?.toFixed(1) || 0}% • 
                  Sample size: {experiment.sample_size || 0}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}