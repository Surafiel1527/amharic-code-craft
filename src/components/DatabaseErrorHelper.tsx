import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface DatabaseErrorHelperProps {
  error: string;
  recommendations?: string[];
}

export function DatabaseErrorHelper({ error, recommendations }: DatabaseErrorHelperProps) {
  const navigate = useNavigate();

  const isAuthError = error.includes('authentication') || error.includes('JWT') || error.includes('permission');
  const isFunctionMissing = error.includes('execute_migration') || error.includes('migration function') || error.includes('Could not find the function');
  const isConnectionError = error.includes('connect') || error.includes('network');
  const isFirstTimeSetup = error.includes('first connection') || isFunctionMissing || error.includes('First-time');
  const isAutoSetupAttempted = error.includes('auto-setup') || error.includes('attempting');

  return (
    <Alert variant="destructive" className="my-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>
        {isFirstTimeSetup ? '🔧 First-Time Database Setup' : 'Database Error'}
      </AlertTitle>
      <AlertDescription className="space-y-3 mt-2">
        <p className="text-sm">{error}</p>
        
        {recommendations && recommendations.length > 0 && (
          <div className="space-y-2">
            <p className="font-semibold text-sm">
              {isFirstTimeSetup ? '📋 Setup Instructions:' : '🔧 How to fix:'}
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {recommendations.map((rec, i) => (
                <li key={i} className="whitespace-pre-wrap font-mono text-xs bg-muted p-1 rounded">
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {isFirstTimeSetup && !isAutoSetupAttempted && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mt-3">
            <p className="text-sm text-blue-900 dark:text-blue-100 font-medium">
              ✨ <strong>The platform is trying to set this up automatically!</strong>
            </p>
            <p className="text-xs text-blue-800 dark:text-blue-200 mt-1">
              If auto-setup doesn't work, you'll see manual instructions above.
            </p>
          </div>
        )}

        {isFirstTimeSetup && isAutoSetupAttempted && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mt-3">
            <p className="text-sm text-amber-900 dark:text-amber-100 font-medium">
              ⚠️ <strong>Auto-setup couldn't complete</strong>
            </p>
            <p className="text-xs text-amber-800 dark:text-amber-200 mt-1">
              Please follow the SQL instructions above - it's a one-time setup!
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mt-3">
          {(isAuthError || isFunctionMissing || isConnectionError) && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/supabase-connections')}
            >
              Check Connection Settings
            </Button>
          )}
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
          >
            Open Supabase Dashboard <ExternalLink className="w-3 h-3 ml-1" />
          </Button>

          {isFunctionMissing && (
            <Button
              size="sm"
              variant="default"
              onClick={() => window.open('https://docs.lovable.dev/troubleshooting/database-setup', '_blank')}
            >
              📖 Setup Guide
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}