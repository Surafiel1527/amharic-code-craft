/**
 * Safety Check Alert Component
 * Displays detailed safety warnings before critical operations
 */

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, XCircle, Info } from "lucide-react";

interface SafetyCheck {
  safe: boolean;
  warnings?: string[];
  error?: string;
  improvement?: {
    type: string;
    applied_at: string;
    affected_tables?: string[];
    affected_functions?: string[];
  };
}

interface SafetyCheckAlertProps {
  safetyCheck: SafetyCheck;
}

export function SafetyCheckAlert({ safetyCheck }: SafetyCheckAlertProps) {
  if (!safetyCheck) return null;

  return (
    <div className="space-y-3">
      {/* Main Status */}
      <Alert variant={safetyCheck.safe ? "default" : "destructive"}>
        <div className="flex items-center gap-2">
          {safetyCheck.safe ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <XCircle className="h-5 w-5 text-red-500" />
          )}
          <AlertTitle className="mb-0">
            Safety Check: {safetyCheck.safe ? "Passed ✓" : "Failed ✗"}
          </AlertTitle>
        </div>
        {safetyCheck.error && (
          <AlertDescription className="mt-2">
            {safetyCheck.error}
          </AlertDescription>
        )}
      </Alert>

      {/* Warnings */}
      {safetyCheck.warnings && safetyCheck.warnings.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Important Warnings</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 space-y-2">
              {safetyCheck.warnings.map((warning, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <span className="text-yellow-500 mt-0.5">⚠️</span>
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Improvement Details */}
      {safetyCheck.improvement && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Rollback Target</AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">Type:</span>
                <Badge variant="outline">{safetyCheck.improvement.type}</Badge>
              </div>
              <div>
                <span className="font-medium">Applied:</span>{" "}
                {new Date(safetyCheck.improvement.applied_at).toLocaleString()}
              </div>
              {safetyCheck.improvement.affected_tables && 
               safetyCheck.improvement.affected_tables.length > 0 && (
                <div>
                  <span className="font-medium">Affected Tables:</span>{" "}
                  {safetyCheck.improvement.affected_tables.join(", ")}
                </div>
              )}
              {safetyCheck.improvement.affected_functions && 
               safetyCheck.improvement.affected_functions.length > 0 && (
                <div>
                  <span className="font-medium">Affected Functions:</span>{" "}
                  {safetyCheck.improvement.affected_functions.join(", ")}
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}