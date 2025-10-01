import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Activity, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock,
  TrendingDown,
  Loader2,
  RefreshCw,
  Shield
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";

interface DetectedError {
  id: string;
  error_type: string;
  error_message: string;
  source: string;
  severity: string;
  status: string;
  fix_attempts: number;
  created_at: string;
  resolved_at: string | null;
}

interface AutoFix {
  id: string;
  fix_type: string;
  explanation: string;
  ai_confidence: number;
  status: string;
  created_at: string;
  applied_at: string | null;
  verified_at: string | null;
  detected_errors: {
    error_type: string;
    error_message: string;
  };
}

export const SelfHealingMonitor = () => {
  const [errors, setErrors] = useState<DetectedError[]>([]);
  const [fixes, setFixes] = useState<AutoFix[]>([]);
  const [loading, setLoading] = useState(true);
  const [systemHealth, setSystemHealth] = useState<any>(null);

  useEffect(() => {
    fetchData();
    subscribeToUpdates();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch recent errors
      const { data: errorsData } = await supabase
        .from('detected_errors')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      // Fetch recent fixes
      const { data: fixesData } = await supabase
        .from('auto_fixes')
        .select('*, detected_errors(*)')
        .order('created_at', { ascending: false })
        .limit(30);

      // Get error rate
      const { data: errorRate } = await supabase.rpc('get_error_rate');

      if (errorsData) setErrors(errorsData);
      if (fixesData) setFixes(fixesData);
      
      setSystemHealth({
        errorRate: errorRate || 0,
        activeErrors: errorsData?.filter(e => e.status === 'detected' || e.status === 'analyzing').length || 0,
        fixedToday: errorsData?.filter(e => 
          e.status === 'fixed' && 
          new Date(e.resolved_at || '').toDateString() === new Date().toDateString()
        ).length || 0
      });

      setLoading(false);
    } catch (error) {
      console.error('Error fetching self-healing data:', error);
      setLoading(false);
    }
  };

  const subscribeToUpdates = () => {
    const errorsChannel = supabase
      .channel('detected_errors_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'detected_errors',
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    const fixesChannel = supabase
      .channel('auto_fixes_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'auto_fixes',
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(errorsChannel);
      supabase.removeChannel(fixesChannel);
    };
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'fixed': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'fixing': return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'analyzing': return <Activity className="h-4 w-4 text-yellow-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Self-Healing System
          </h2>
          <p className="text-muted-foreground">Autonomous error detection and fixing</p>
        </div>
        <Button onClick={fetchData} variant="outline" size="icon">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Health Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemHealth?.errorRate?.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">Last hour</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Errors</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemHealth?.activeErrors || 0}</div>
            <p className="text-xs text-muted-foreground">Being analyzed/fixed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fixed Today</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemHealth?.fixedToday || 0}</div>
            <p className="text-xs text-muted-foreground">Automatically resolved</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="errors" className="space-y-4">
        <TabsList>
          <TabsTrigger value="errors">Detected Errors</TabsTrigger>
          <TabsTrigger value="fixes">Applied Fixes</TabsTrigger>
        </TabsList>

        <TabsContent value="errors">
          <ScrollArea className="h-[600px]">
            <div className="space-y-3">
              {errors.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    No errors detected. System is healthy! 🎉
                  </CardContent>
                </Card>
              ) : (
                errors.map((error) => (
                  <Card key={error.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(error.status)}
                          <div>
                            <CardTitle className="text-base">{error.error_type}</CardTitle>
                            <CardDescription className="line-clamp-1">
                              {error.error_message}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getSeverityColor(error.severity)}>
                            {error.severity}
                          </Badge>
                          <Badge variant="outline">{error.status}</Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-4">
                          <span className="text-muted-foreground">
                            Source: {error.source}
                          </span>
                          <span className="text-muted-foreground">
                            Attempts: {error.fix_attempts}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(error.created_at), { addSuffix: true })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="fixes">
          <ScrollArea className="h-[600px]">
            <div className="space-y-3">
              {fixes.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    No fixes applied yet
                  </CardContent>
                </Card>
              ) : (
                fixes.map((fix) => (
                  <Card key={fix.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <CardTitle className="text-base">
                            {fix.detected_errors?.error_type}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {fix.explanation}
                          </CardDescription>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Badge variant={
                            fix.status === 'verified' ? 'default' :
                            fix.status === 'applied' ? 'secondary' :
                            fix.status === 'rolled_back' ? 'destructive' :
                            'outline'
                          }>
                            {fix.status}
                          </Badge>
                          <Badge variant="outline">
                            {(fix.ai_confidence * 100).toFixed(0)}% confident
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Type: {fix.fix_type}
                        </span>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(fix.created_at), { addSuffix: true })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};
