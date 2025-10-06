import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, ArrowUp, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PackageUpdate {
  id: string;
  package_name: string;
  current_version: string;
  latest_version: string;
  update_type: 'major' | 'minor' | 'patch';
  breaking_changes: boolean;
  auto_update_approved: boolean;
  created_at: string;
}

export const PackageUpdateManager = () => {
  const [updates, setUpdates] = useState<PackageUpdate[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadUpdates();
  }, []);

  const loadUpdates = async () => {
    const { data } = await supabase
      .from('package_updates')
      .select('*')
      .is('installed_at', null)
      .order('created_at', { ascending: false });

    if (data) setUpdates(data as unknown as PackageUpdate[]);
  };

  const checkForUpdates = async () => {
    setIsChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-package-updater', {
        body: { mode: 'check' }
      });

      if (error) throw error;

      toast({
        title: 'Update Check Complete',
        description: `Found ${data.updatesFound} available updates`
      });

      await loadUpdates();
    } catch (error) {
      toast({
        title: 'Update Check Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsChecking(false);
    }
  };

  const autoUpdate = async () => {
    setIsUpdating(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-package-updater', {
        body: { mode: 'auto-update' }
      });

      if (error) throw error;

      toast({
        title: 'Auto-Update Complete',
        description: `Updated ${data.autoUpdated} packages safely`
      });

      await loadUpdates();
    } catch (error) {
      toast({
        title: 'Auto-Update Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const safeUpdates = updates.filter(u => u.auto_update_approved);
  const manualUpdates = updates.filter(u => !u.auto_update_approved);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Package Updates</h3>
          <p className="text-sm text-muted-foreground">
            {updates.length} updates available
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={checkForUpdates} disabled={isChecking}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
            Check Updates
          </Button>
          {safeUpdates.length > 0 && (
            <Button onClick={autoUpdate} disabled={isUpdating} variant="default">
              <ArrowUp className="h-4 w-4 mr-2" />
              Auto-Update ({safeUpdates.length})
            </Button>
          )}
        </div>
      </div>

      {safeUpdates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Safe to Auto-Update</CardTitle>
            <CardDescription>These updates are non-breaking and AI-verified</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {safeUpdates.map((update) => (
                <div key={update.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <div>
                      <div className="font-medium">{update.package_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {update.current_version} → {update.latest_version}
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline">{update.update_type}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {manualUpdates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Manual Review Required</CardTitle>
            <CardDescription>These updates may contain breaking changes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {manualUpdates.map((update) => (
                <div key={update.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                    <div>
                      <div className="font-medium">{update.package_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {update.current_version} → {update.latest_version}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={update.breaking_changes ? 'destructive' : 'secondary'}>
                      {update.update_type}
                    </Badge>
                    {update.breaking_changes && (
                      <Badge variant="destructive">Breaking</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {updates.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <p className="text-muted-foreground">All packages are up to date</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};