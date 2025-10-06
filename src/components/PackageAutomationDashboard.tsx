import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Bot, CheckCircle2, Clock, XCircle, Zap, Shield, RefreshCw, AlertTriangle } from "lucide-react";

export const PackageAutomationDashboard = () => {
  const [operations, setOperations] = useState<any[]>([]);
  const [monitors, setMonitors] = useState<any[]>([]);
  const [automationRules, setAutomationRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
    
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [opsRes, monitorsRes, rulesRes] = await Promise.all([
        supabase.from('package_operations').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('package_monitors').select('*'),
        supabase.from('package_automation_rules').select('*')
      ]);

      if (opsRes.data) setOperations(opsRes.data);
      if (monitorsRes.data) setMonitors(monitorsRes.data);
      if (rulesRes.data) setAutomationRules(rulesRes.data);
      
      setLoading(false);
    } catch (error: any) {
      console.error('Error fetching automation data:', error);
    }
  };

  const toggleMonitor = async (monitorId: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('package_monitors')
        .update({ is_active: !currentState })
        .eq('id', monitorId);

      if (error) throw error;

      toast({
        title: !currentState ? "Monitor Enabled" : "Monitor Disabled",
        description: !currentState ? "Continuous monitoring is now active" : "Continuous monitoring has been paused"
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const toggleAutoFix = async (monitorId: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('package_monitors')
        .update({ auto_fix_enabled: !currentState })
        .eq('id', monitorId);

      if (error) throw error;

      toast({
        title: !currentState ? "Auto-Fix Enabled" : "Auto-Fix Disabled",
        description: !currentState ? "Issues will be fixed automatically" : "Issues will only be detected"
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'in_progress': return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getMonitorIcon = (type: string) => {
    switch (type) {
      case 'security': return <Shield className="w-4 h-4" />;
      case 'updates': return <RefreshCw className="w-4 h-4" />;
      case 'conflicts': return <AlertTriangle className="w-4 h-4" />;
      default: return <Bot className="w-4 h-4" />;
    }
  };

  const stats = {
    total: operations.length,
    completed: operations.filter(o => o.status === 'completed').length,
    pending: operations.filter(o => o.status === 'pending').length,
    failed: operations.filter(o => o.status === 'failed').length,
    activeMonitors: monitors.filter(m => m.is_active).length,
    autoFixEnabled: monitors.filter(m => m.auto_fix_enabled).length
  };

  const successRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading automation data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Zap className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successRate}%</div>
            <Progress value={successRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {stats.completed} of {stats.total} operations successful
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Monitors</CardTitle>
            <Bot className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeMonitors}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {stats.autoFixEnabled} with auto-fix enabled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Operations</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {stats.failed} failed operations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Continuous Monitors */}
      <Card>
        <CardHeader>
          <CardTitle>Continuous Monitoring</CardTitle>
          <CardDescription>
            Automated monitors that continuously check and fix package issues
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {monitors.length === 0 ? (
              <p className="text-sm text-muted-foreground">No monitors configured</p>
            ) : (
              monitors.map((monitor) => (
                <div key={monitor.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getMonitorIcon(monitor.monitor_type)}
                    <div>
                      <p className="font-medium capitalize">{monitor.monitor_type} Monitor</p>
                      <p className="text-sm text-muted-foreground">
                        Checks every {monitor.check_interval_hours}h · {monitor.findings_count} findings
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Auto-Fix</span>
                      <Switch
                        checked={monitor.auto_fix_enabled}
                        onCheckedChange={() => toggleAutoFix(monitor.id, monitor.auto_fix_enabled)}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Active</span>
                      <Switch
                        checked={monitor.is_active}
                        onCheckedChange={() => toggleMonitor(monitor.id, monitor.is_active)}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Operations */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Automated Operations</CardTitle>
          <CardDescription>
            Latest package installations, updates, and fixes applied automatically
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {operations.slice(0, 10).map((op) => (
              <div key={op.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(op.status)}
                  <div>
                    <p className="font-medium">
                      {op.operation_type} {op.package_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {op.from_version && `${op.from_version} → `}{op.to_version}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={
                    op.triggered_by === 'ai_auto' ? 'default' :
                    op.triggered_by === 'security_scan' ? 'destructive' :
                    'secondary'
                  }>
                    {op.triggered_by.replace('_', ' ')}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(op.created_at).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};