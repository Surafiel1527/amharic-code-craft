import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Database,
  Key,
  Lock,
  TrendingUp,
  Eye
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SecurityMetrics {
  totalCredentials: number;
  activeConnections: number;
  failedConnections: number;
  lastAuditDate: string;
  sensitiveDataExposures: number;
  encryptedSecrets: number;
}

interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  resource: string;
  status: 'success' | 'failure' | 'warning';
  details: string;
}

export const SecurityDashboard = () => {
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    totalCredentials: 0,
    activeConnections: 0,
    failedConnections: 0,
    lastAuditDate: new Date().toISOString(),
    sensitiveDataExposures: 0,
    encryptedSecrets: 0
  });
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSecurityMetrics();
    fetchAuditLogs();
  }, []);

  const fetchSecurityMetrics = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-security-metrics');
      
      if (error) throw error;
      
      setMetrics(data?.metrics || metrics);
    } catch (error: any) {
      console.error('Error fetching security metrics:', error);
      toast.error('Failed to load security metrics');
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-security-audit-logs');
      
      if (error) throw error;
      
      setAuditLogs(data?.logs || []);
    } catch (error: any) {
      console.error('Error fetching audit logs:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failure':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getSecurityScore = () => {
    const total = metrics.totalCredentials + metrics.encryptedSecrets;
    const safe = metrics.activeConnections + metrics.encryptedSecrets;
    const issues = metrics.failedConnections + metrics.sensitiveDataExposures;
    
    if (total === 0) return 100;
    
    const score = Math.max(0, Math.min(100, Math.round(((safe - issues) / total) * 100)));
    return score;
  };

  const securityScore = getSecurityScore();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          <div>
            <CardTitle>Security Dashboard</CardTitle>
            <CardDescription>Monitor your security posture and credential health</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="credentials">Credentials</TabsTrigger>
            <TabsTrigger value="audit">Audit Log</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* Security Score */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Security Score</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold">{securityScore}</span>
                      <span className="text-muted-foreground">/100</span>
                    </div>
                  </div>
                  <div className={`p-4 rounded-full ${
                    securityScore >= 80 ? 'bg-green-500/10' :
                    securityScore >= 60 ? 'bg-yellow-500/10' :
                    'bg-red-500/10'
                  }`}>
                    <Shield className={`w-12 h-12 ${
                      securityScore >= 80 ? 'text-green-500' :
                      securityScore >= 60 ? 'text-yellow-500' :
                      'text-red-500'
                    }`} />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${
                        securityScore >= 80 ? 'bg-green-500' :
                        securityScore >= 60 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${securityScore}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Active Connections</p>
                      <p className="text-2xl font-bold">{metrics.activeConnections}</p>
                    </div>
                    <Activity className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Failed Connections</p>
                      <p className="text-2xl font-bold">{metrics.failedConnections}</p>
                    </div>
                    <AlertTriangle className="w-8 h-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Encrypted Secrets</p>
                      <p className="text-2xl font-bold">{metrics.encryptedSecrets}</p>
                    </div>
                    <Lock className="w-8 h-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Data Exposures</p>
                      <p className="text-2xl font-bold">{metrics.sensitiveDataExposures}</p>
                    </div>
                    <Eye className="w-8 h-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Security Recommendations */}
            {(metrics.failedConnections > 0 || metrics.sensitiveDataExposures > 0) && (
              <Card className="border-yellow-500/50 bg-yellow-500/5">
                <CardContent className="pt-6">
                  <div className="flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div className="space-y-2">
                      <p className="font-semibold">Security Recommendations</p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        {metrics.failedConnections > 0 && (
                          <li>Review and update {metrics.failedConnections} failed connection(s)</li>
                        )}
                        {metrics.sensitiveDataExposures > 0 && (
                          <li>Address {metrics.sensitiveDataExposures} sensitive data exposure(s)</li>
                        )}
                        <li>Enable auto-masking for sensitive data detection</li>
                        <li>Regularly rotate your database credentials</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Credentials Tab */}
          <TabsContent value="credentials">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Credential Health</h3>
                    <Badge variant="outline">
                      {metrics.totalCredentials} Total
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="text-sm">Healthy Connections</span>
                      </div>
                      <Badge className="bg-green-500/10 text-green-500">
                        {metrics.activeConnections}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <span className="text-sm">Failed Connections</span>
                      </div>
                      <Badge className="bg-red-500/10 text-red-500">
                        {metrics.failedConnections}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Log Tab */}
          <TabsContent value="audit">
            <Card>
              <CardContent className="pt-6">
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-2">
                    {auditLogs.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No audit logs yet</p>
                      </div>
                    ) : (
                      auditLogs.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/5 transition-colors"
                        >
                          {getStatusIcon(log.status)}
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium">{log.action}</p>
                              <span className="text-xs text-muted-foreground">
                                {new Date(log.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">{log.details}</p>
                            <Badge variant="outline" className="text-xs">
                              {log.resource}
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
