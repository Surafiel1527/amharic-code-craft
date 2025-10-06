import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Shield, AlertTriangle, Activity, Key, Clock, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { logger } from "@/utils/logger";

interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  resource_type: string;
  severity: string;
  ip_address: string | null;
  created_at: string;
  metadata: any;
}

interface SecurityEvent {
  id: string;
  event_type: string;
  ip_address: string;
  resolved: boolean;
  created_at: string;
  details: any;
}

interface SecurityStats {
  totalAuditLogs: number;
  criticalEvents: number;
  unresolvedEvents: number;
  activeSessions: number;
}

export const AdminSecurityDashboard = () => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [stats, setStats] = useState<SecurityStats>({
    totalAuditLogs: 0,
    criticalEvents: 0,
    unresolvedEvents: 0,
    activeSessions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const fetchSecurityData = async () => {
    try {
      setLoading(true);

      // Fetch audit logs (last 100)
      const { data: logs } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      // Fetch security events
      const { data: events } = await supabase
        .from("security_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      // Fetch stats
      const { count: totalLogs } = await supabase
        .from("audit_logs")
        .select("*", { count: "exact", head: true });

      const { count: criticalCount } = await supabase
        .from("audit_logs")
        .select("*", { count: "exact", head: true })
        .eq("severity", "critical");

      const { count: unresolvedCount } = await supabase
        .from("security_events")
        .select("*", { count: "exact", head: true })
        .eq("resolved", false);

      const { count: sessionsCount } = await supabase
        .from("user_sessions")
        .select("*", { count: "exact", head: true })
        .gt("expires_at", new Date().toISOString());

      setAuditLogs(logs || []);
      setSecurityEvents(events || []);
      setStats({
        totalAuditLogs: totalLogs || 0,
        criticalEvents: criticalCount || 0,
        unresolvedEvents: unresolvedCount || 0,
        activeSessions: sessionsCount || 0,
      });
    } catch (error) {
      logger.error("Error fetching security data", error);
      toast.error("Failed to load security data");
    } finally {
      setLoading(false);
    }
  };

  const resolveSecurityEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from("security_events")
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq("id", eventId);

      if (error) throw error;

      toast.success("Security event resolved");
      fetchSecurityData();
    } catch (error) {
      logger.error("Error resolving event", error);
      toast.error("Failed to resolve event");
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "destructive";
      case "warning":
        return "default";
      default:
        return "secondary";
    }
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case "failed_login":
        return <AlertTriangle className="h-4 w-4" />;
      case "rate_limit_exceeded":
        return <Clock className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Audit Logs</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAuditLogs}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Events</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.criticalEvents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unresolved Events</CardTitle>
            <Shield className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stats.unresolvedEvents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeSessions}</div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Views */}
      <Card>
        <CardHeader>
          <CardTitle>Security Monitoring</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="events" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="events">Security Events</TabsTrigger>
              <TabsTrigger value="logs">Audit Logs</TabsTrigger>
            </TabsList>

            <TabsContent value="events" className="space-y-4">
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {securityEvents.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="h-12 w-12 mx-auto mb-2 text-success" />
                      <p>No security events detected</p>
                    </div>
                  ) : (
                    securityEvents.map((event) => (
                      <Card key={event.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex gap-3 flex-1">
                              {getEventTypeIcon(event.event_type)}
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium">{event.event_type.replace(/_/g, " ").toUpperCase()}</span>
                                  {event.resolved ? (
                                    <Badge variant="outline" className="text-success">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Resolved
                                    </Badge>
                                  ) : (
                                    <Badge variant="destructive">Active</Badge>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground space-y-1">
                                  <p>IP: {event.ip_address}</p>
                                  <p>Time: {new Date(event.created_at).toLocaleString()}</p>
                                  {event.details && Object.keys(event.details).length > 0 && (
                                    <pre className="text-xs bg-muted p-2 rounded mt-2">
                                      {JSON.stringify(event.details, null, 2)}
                                    </pre>
                                  )}
                                </div>
                              </div>
                            </div>
                            {!event.resolved && (
                              <Button
                                size="sm"
                                onClick={() => resolveSecurityEvent(event.id)}
                              >
                                Resolve
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="logs" className="space-y-4">
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {auditLogs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No audit logs available
                    </div>
                  ) : (
                    auditLogs.map((log) => (
                      <Card key={log.id}>
                        <CardContent className="p-3">
                          <div className="flex items-center gap-3">
                            <Badge variant={getSeverityColor(log.severity) as any}>
                              {log.severity}
                            </Badge>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{log.action}</span>
                                <span className="text-muted-foreground text-sm">
                                  on {log.resource_type}
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground flex gap-4 mt-1">
                                <span>{new Date(log.created_at).toLocaleString()}</span>
                                {log.ip_address && <span>IP: {log.ip_address}</span>}
                              </div>
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
        </CardContent>
      </Card>
    </div>
  );
};
