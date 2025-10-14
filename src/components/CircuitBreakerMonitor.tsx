import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CircuitBreakerState {
  serviceName: string;
  state: 'closed' | 'open' | 'half_open';
  failureCount: number;
  successCount: number;
  lastFailureAt: string | null;
  lastSuccessAt: string | null;
  nextRetryAt: string | null;
}

export function CircuitBreakerMonitor() {
  const [circuits, setCircuits] = useState<CircuitBreakerState[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCircuitStates();
    
    // Refresh every 10 seconds
    const interval = setInterval(loadCircuitStates, 10000);
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('circuit-breaker-updates')
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'circuit_breaker_state'
        } as any,
        () => {
          loadCircuitStates();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      channel.unsubscribe();
    };
  }, []);

  async function loadCircuitStates() {
    try {
      const { data, error } = await supabase
        .from('circuit_breaker_state' as any)
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setCircuits((data as any) || []);
    } catch (error) {
      console.error('Failed to load circuit breaker states:', error);
    } finally {
      setLoading(false);
    }
  }

  const getStateIcon = (state: string) => {
    switch (state) {
      case 'closed':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'open':
        return <XCircle className="w-4 h-4 text-destructive" />;
      case 'half_open':
        return <AlertCircle className="w-4 h-4 text-warning" />;
      default:
        return null;
    }
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'closed':
        return 'success';
      case 'open':
        return 'destructive';
      case 'half_open':
        return 'warning';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/4"></div>
          <div className="space-y-2">
            <div className="h-16 bg-muted rounded"></div>
            <div className="h-16 bg-muted rounded"></div>
          </div>
        </div>
      </Card>
    );
  }

  if (circuits.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          <CheckCircle className="w-12 h-12 mx-auto mb-2 text-success" />
          <p>All services are healthy</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Circuit Breaker Status</h3>
      <div className="grid gap-4">
        {circuits.map((circuit) => (
          <Card key={circuit.serviceName} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {getStateIcon(circuit.state)}
                  <h4 className="font-medium">{circuit.serviceName}</h4>
                  <Badge variant={getStateColor(circuit.state) as any}>
                    {circuit.state.toUpperCase()}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div>
                    <span className="font-medium">Failures:</span> {circuit.failureCount}
                  </div>
                  <div>
                    <span className="font-medium">Successes:</span> {circuit.successCount}
                  </div>
                  {circuit.lastFailureAt && (
                    <div className="col-span-2">
                      <span className="font-medium">Last Failure:</span>{' '}
                      {new Date(circuit.lastFailureAt).toLocaleString()}
                    </div>
                  )}
                  {circuit.nextRetryAt && circuit.state === 'open' && (
                    <div className="col-span-2">
                      <span className="font-medium">Next Retry:</span>{' '}
                      {new Date(circuit.nextRetryAt).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
