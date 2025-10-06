import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SecurityScan {
  id: string;
  package_name: string;
  version: string;
  vulnerability_count: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  vulnerabilities: any[];
  scan_date: string;
}

export const PackageSecurityDashboard = () => {
  const [scans, setScans] = useState<SecurityScan[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadScans();
  }, []);

  const loadScans = async () => {
    const { data } = await supabase
      .from('package_security_scans')
      .select('*')
      .order('scan_date', { ascending: false })
      .limit(10);

    if (data) setScans(data as unknown as SecurityScan[]);
  };

  const scanPackage = async (packageName: string, version: string) => {
    setIsScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-package-security-scanner', {
        body: { packageName, version }
      });

      if (error) throw error;

      toast({
        title: data.recommendation.includes('BLOCK') ? 'Security Issue' : 'Scan Complete',
        description: data.recommendation,
        variant: data.recommendation.includes('BLOCK') ? 'destructive' : 'default'
      });

      await loadScans();
    } catch (error) {
      toast({
        title: 'Scan Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsScanning(false);
    }
  };

  const totalVulnerabilities = scans.reduce((sum, s) => sum + s.vulnerability_count, 0);
  const criticalCount = scans.reduce((sum, s) => sum + s.critical_count, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Total Scans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scans.length}</div>
            <p className="text-xs text-muted-foreground">Security checks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Vulnerabilities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVulnerabilities}</div>
            <p className="text-xs text-muted-foreground">Total found</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Critical</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{criticalCount}</div>
            <p className="text-xs text-muted-foreground">Requires action</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {criticalCount === 0 ? (
                <><CheckCircle className="h-5 w-5 text-green-500" /> <span className="font-semibold">Safe</span></>
              ) : (
                <><AlertTriangle className="h-5 w-5 text-destructive" /> <span className="font-semibold">At Risk</span></>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Security Scans</CardTitle>
          <CardDescription>AI-powered vulnerability detection</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {scans.map((scan) => (
              <div key={scan.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-primary" />
                  <div>
                    <div className="font-semibold">{scan.package_name}@{scan.version}</div>
                    <div className="text-sm text-muted-foreground">
                      {scan.vulnerability_count} vulnerabilities found
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {scan.critical_count > 0 && (
                    <Badge variant="destructive">
                      {scan.critical_count} Critical
                    </Badge>
                  )}
                  {scan.high_count > 0 && (
                    <Badge variant="default">
                      {scan.high_count} High
                    </Badge>
                  )}
                  {scan.medium_count > 0 && (
                    <Badge variant="secondary">
                      {scan.medium_count} Medium
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};