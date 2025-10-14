/**
 * Rollback History Component
 * Shows complete audit trail of all rollbacks performed
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, CheckCircle2, XCircle, Clock, User } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface RollbackRecord {
  id: string;
  improvement_id: string;
  rolled_back_by: string;
  rolled_back_at: string;
  reason: string;
  success: boolean;
  before_rollback: any;
  after_rollback: any;
  error_message: string | null;
}

export function RollbackHistory() {
  const { data: history, isLoading } = useQuery({
    queryKey: ["rollback-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rollback_history")
        .select("*")
        .order("rolled_back_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as RollbackRecord[];
    },
  });

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          Loading rollback history...
        </div>
      </Card>
    );
  }

  if (!history || history.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center space-y-2">
          <History className="h-12 w-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">No rollbacks performed yet</p>
          <p className="text-sm text-muted-foreground">
            This is a good sign - your system is stable!
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <History className="h-5 w-5" />
              Rollback History
            </h3>
            <p className="text-sm text-muted-foreground">
              Complete audit trail of all rollback operations
            </p>
          </div>
          <Badge variant="outline">{history.length} total</Badge>
        </div>

        <Separator />

        <ScrollArea className="h-[600px]">
          <div className="space-y-4">
            {history.map((record) => (
              <Card key={record.id} className="p-4">
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {record.success ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      <div>
                        <p className="font-medium">
                          {record.success ? "Successful Rollback" : "Failed Rollback"}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <Clock className="h-3 w-3" />
                          {new Date(record.rolled_back_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant={record.success ? "default" : "destructive"}
                      className="text-xs"
                    >
                      {record.success ? "Applied" : "Failed"}
                    </Badge>
                  </div>

                  {/* Reason */}
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-sm font-medium mb-1">Rollback Reason</p>
                    <p className="text-sm text-muted-foreground">{record.reason}</p>
                  </div>

                  {/* Error Message (if failed) */}
                  {!record.success && record.error_message && (
                    <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
                      <p className="text-sm font-medium text-red-500 mb-1">
                        Error Details
                      </p>
                      <p className="text-sm text-red-500/90">
                        {record.error_message}
                      </p>
                    </div>
                  )}

                  {/* State Changes */}
                  {record.success && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          Before Rollback
                        </p>
                        <div className="bg-muted p-2 rounded text-xs">
                          <pre className="overflow-auto max-h-20">
                            {JSON.stringify(record.before_rollback, null, 2)}
                          </pre>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          After Rollback
                        </p>
                        <div className="bg-muted p-2 rounded text-xs">
                          <pre className="overflow-auto max-h-20">
                            {JSON.stringify(record.after_rollback, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                    <User className="h-3 w-3" />
                    <span>Rollback ID: {record.id.slice(0, 8)}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>
    </Card>
  );
}