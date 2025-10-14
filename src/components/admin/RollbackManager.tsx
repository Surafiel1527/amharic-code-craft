import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, Undo2, CheckCircle2, XCircle, History } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AppliedImprovement {
  id: string;
  item_type: string;
  applied_at: string;
  rolled_back: boolean;
  previous_state: any;
  new_state: any;
  metadata: any;
  affected_tables: string[];
  deployment_safe: boolean;
}

interface RollbackManagerProps {
  improvementId?: string;
  onClose?: () => void;
}

export function RollbackManager({ improvementId, onClose }: RollbackManagerProps) {
  const [selectedImprovement, setSelectedImprovement] = useState<AppliedImprovement | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [rollbackReason, setRollbackReason] = useState("");
  const [safetyCheck, setSafetyCheck] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch applied improvements
  const { data: improvements, isLoading } = useQuery({
    queryKey: ["applied-improvements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applied_improvements")
        .select("*")
        .eq("rolled_back", false)
        .order("applied_at", { ascending: false });

      if (error) throw error;
      return data as AppliedImprovement[];
    },
  });

  // Check rollback safety
  const checkSafety = async (id: string) => {
    const { data, error } = await supabase.rpc("check_rollback_safety", {
      p_improvement_id: id,
    });

    if (error) {
      toast({
        title: "Safety Check Failed",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }

    return data;
  };

  // Execute rollback mutation
  const rollbackMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const { data, error } = await supabase.rpc("execute_rollback", {
        p_improvement_id: id,
        p_user_id: userData.user.id,
        p_reason: reason,
      });

      if (error) throw error;
      
      const result = data as any;
      if (!result?.success) throw new Error(result?.error || "Rollback failed");

      // Call the edge function to apply the actual rollback
      const { error: functionError } = await supabase.functions.invoke(
        "admin-approval-handler",
        {
          body: {
            action: "rollback",
            improvementId: id,
            reason,
          },
        }
      );

      if (functionError) throw functionError;

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applied-improvements"] });
      toast({
        title: "✅ Rollback Successful",
        description: "Improvement has been successfully rolled back",
      });
      setShowConfirmDialog(false);
      setSelectedImprovement(null);
      onClose?.();
    },
    onError: (error: any) => {
      toast({
        title: "Rollback Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleInitiateRollback = async (improvement: AppliedImprovement) => {
    setSelectedImprovement(improvement);
    const safety = await checkSafety(improvement.id);
    setSafetyCheck(safety);
    setShowConfirmDialog(true);
  };

  const handleConfirmRollback = () => {
    if (!selectedImprovement || !rollbackReason.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a reason for the rollback",
        variant: "destructive",
      });
      return;
    }

    rollbackMutation.mutate({
      id: selectedImprovement.id,
      reason: rollbackReason,
    });
  };

  return (
    <>
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <History className="h-5 w-5" />
                Applied Improvements
              </h3>
              <p className="text-sm text-muted-foreground">
                Rollback approved changes if needed
              </p>
            </div>
          </div>

          <ScrollArea className="h-[500px]">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : improvements?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No applied improvements found
              </div>
            ) : (
              <div className="space-y-3">
                {improvements?.map((improvement) => (
                  <Card key={improvement.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{improvement.item_type}</Badge>
                            {!improvement.deployment_safe && (
                              <Badge variant="destructive" className="text-xs">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Deployment Impact
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Applied: {new Date(improvement.applied_at).toLocaleString()}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleInitiateRollback(improvement)}
                          disabled={rollbackMutation.isPending}
                        >
                          <Undo2 className="h-4 w-4 mr-2" />
                          Rollback
                        </Button>
                      </div>

                      {improvement.affected_tables?.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          Affected: {improvement.affected_tables.join(", ")}
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </Card>

      {/* Rollback Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Confirm Rollback
            </DialogTitle>
            <DialogDescription>
              This will revert the approved improvement. Review the impact carefully.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Safety Check Results */}
            {safetyCheck && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {safetyCheck.safe ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span className="font-medium">
                    Safety Check: {safetyCheck.safe ? "Passed" : "Failed"}
                  </span>
                </div>

                {safetyCheck.warnings?.length > 0 && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Warnings
                    </h4>
                    <ul className="space-y-1 text-sm">
                      {safetyCheck.warnings.map((warning: string, idx: number) => (
                        <li key={idx}>⚠️ {warning}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {safetyCheck.error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                    <p className="text-sm text-red-500">{safetyCheck.error}</p>
                  </div>
                )}
              </div>
            )}

            {/* Previous vs New State Preview */}
            {selectedImprovement && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-2 text-green-500">
                    Current State (Will be removed)
                  </h4>
                  <div className="bg-muted p-3 rounded text-xs">
                    <pre className="overflow-auto max-h-32">
                      {JSON.stringify(selectedImprovement.new_state, null, 2)}
                    </pre>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2 text-blue-500">
                    Previous State (Will be restored)
                  </h4>
                  <div className="bg-muted p-3 rounded text-xs">
                    <pre className="overflow-auto max-h-32">
                      {JSON.stringify(selectedImprovement.previous_state, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {/* Rollback Reason */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Rollback Reason *
              </label>
              <Textarea
                placeholder="Explain why this rollback is necessary..."
                value={rollbackReason}
                onChange={(e) => setRollbackReason(e.target.value)}
                rows={4}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={rollbackMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmRollback}
              disabled={
                rollbackMutation.isPending ||
                !rollbackReason.trim() ||
                (safetyCheck && !safetyCheck.safe)
              }
            >
              <Undo2 className="h-4 w-4 mr-2" />
              {rollbackMutation.isPending ? "Rolling back..." : "Confirm Rollback"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
