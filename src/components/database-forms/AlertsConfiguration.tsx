import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AlertsConfigurationProps {
  credentialId: string;
  userId: string;
}

export function AlertsConfiguration({ credentialId, userId }: AlertsConfigurationProps) {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [newAlert, setNewAlert] = useState({
    alert_type: 'downtime',
    threshold: {},
    notification_channels: ['email'],
    enabled: true
  });

  const loadAlerts = async () => {
    const { data, error } = await supabase
      .from('database_alert_config')
      .select('*')
      .eq('credential_id', credentialId);

    if (!error && data) {
      setAlerts(data);
    }
  };

  const addAlert = async () => {
    try {
      const threshold = getThresholdForType(newAlert.alert_type);
      
      const { error } = await supabase
        .from('database_alert_config')
        .insert({
          user_id: userId,
          credential_id: credentialId,
          alert_type: newAlert.alert_type,
          threshold,
          notification_channels: newAlert.notification_channels,
          enabled: true
        });

      if (error) throw error;

      toast.success('Alert configuration added');
      loadAlerts();
    } catch (error) {
      toast.error('Failed to add alert');
    }
  };

  const deleteAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('database_alert_config')
        .delete()
        .eq('id', alertId);

      if (error) throw error;

      toast.success('Alert deleted');
      loadAlerts();
    } catch (error) {
      toast.error('Failed to delete alert');
    }
  };

  const toggleAlert = async (alertId: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('database_alert_config')
        .update({ enabled })
        .eq('id', alertId);

      if (error) throw error;

      toast.success(enabled ? 'Alert enabled' : 'Alert disabled');
      loadAlerts();
    } catch (error) {
      toast.error('Failed to update alert');
    }
  };

  const getThresholdForType = (type: string) => {
    switch (type) {
      case 'downtime':
        return { max_downtime_minutes: 5 };
      case 'slow_response':
        return { max_response_time_ms: 3000 };
      case 'error_rate':
        return { error_rate_percentage: 20 };
      case 'security':
        return { failed_auth_attempts: 3 };
      default:
        return {};
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Alert Configuration
        </CardTitle>
        <CardDescription>
          Set up alerts for connection health, performance, and security issues
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 border rounded-lg space-y-4">
          <h4 className="font-semibold">Add New Alert</h4>
          
          <div className="space-y-3">
            <div>
              <Label>Alert Type</Label>
              <Select
                value={newAlert.alert_type}
                onValueChange={(value) => setNewAlert({ ...newAlert, alert_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="downtime">Connection Downtime</SelectItem>
                  <SelectItem value="slow_response">Slow Response Time</SelectItem>
                  <SelectItem value="error_rate">High Error Rate</SelectItem>
                  <SelectItem value="security">Security Issues</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={addAlert} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Alert
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold">Active Alerts</h4>
          {alerts.map((alert) => (
            <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1">
                <p className="font-medium capitalize">{alert.alert_type.replace('_', ' ')}</p>
                <p className="text-xs text-muted-foreground">
                  Threshold: {JSON.stringify(alert.threshold)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={alert.enabled}
                  onCheckedChange={(checked) => toggleAlert(alert.id, checked)}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteAlert(alert.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {alerts.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No alerts configured yet
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
