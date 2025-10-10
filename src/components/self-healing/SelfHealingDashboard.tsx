import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, TrendingUp, Zap, Shield, Activity } from "lucide-react";

export default function SelfHealingDashboard() {
  const { data: stats } = useQuery({
    queryKey: ['self-healing-stats'],
    queryFn: async () => {
      const { data: fixes } = await supabase
        .from('auto_fixes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      const { data: patterns } = await supabase
        .from('universal_error_patterns')
        .select('*')
        .order('confidence_score', { ascending: false });

      const { data: improvements } = await supabase
        .from('ai_improvements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      const successfulFixes = fixes?.filter(f => f.status === 'verified').length || 0;
      const totalFixes = fixes?.length || 0;
      const successRate = totalFixes > 0 ? (successfulFixes / totalFixes) * 100 : 0;

      const avgConfidence = patterns?.reduce((sum, p) => sum + p.confidence_score, 0) / (patterns?.length || 1);

      const approvedImprovements = improvements?.filter(i => i.status === 'approved').length || 0;

      return {
        successRate: successRate.toFixed(1),
        totalFixes,
        successfulFixes,
        patternsLearned: patterns?.length || 0,
        avgConfidence: (avgConfidence * 100).toFixed(1),
        improvements: improvements?.length || 0,
        approvedImprovements,
        recentFixes: fixes?.slice(0, 5) || []
      };
    },
    refetchInterval: 30000
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Brain className="h-6 w-6 text-primary" />
          Self-Healing Intelligence
        </h2>
        <p className="text-muted-foreground mt-1">
          Autonomous system monitoring, learning, and optimization
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.successRate || '0'}%</div>
            <p className="text-xs text-muted-foreground">
              {stats?.successfulFixes || 0} / {stats?.totalFixes || 0} fixes verified
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Patterns Learned</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.patternsLearned || 0}</div>
            <p className="text-xs text-muted-foreground">
              Avg confidence: {stats?.avgConfidence || '0'}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Auto Fixes</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalFixes || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.successfulFixes || 0} successful
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Improvements</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.improvements || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.approvedImprovements || 0} deployed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Healing Activity
          </CardTitle>
          <CardDescription>
            Latest autonomous fixes and improvements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats?.recentFixes.map((fix: any) => (
              <div key={fix.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{fix.fix_type}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {fix.explanation}
                  </p>
                </div>
                <Badge variant={
                  fix.status === 'verified' ? 'default' :
                  fix.status === 'applied' ? 'secondary' :
                  fix.status === 'failed' ? 'destructive' :
                  'outline'
                }>
                  {fix.status}
                </Badge>
              </div>
            ))}
            {(!stats?.recentFixes || stats.recentFixes.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No recent healing activity
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
