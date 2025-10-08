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
  const isFunctionMissing = error.includes('execute_migration') && error.includes('does not exist');
  const isConnectionError = error.includes('connect') || error.includes('network');

  return (
    <Alert variant="destructive" className="my-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Database Setup Failed</AlertTitle>
      <AlertDescription className="space-y-3 mt-2">
        <p>{error}</p>
        
        {recommendations && recommendations.length > 0 && (
          <div className="space-y-2">
            <p className="font-semibold text-sm">How to fix:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {recommendations.map((rec, i) => (
                <li key={i} className="whitespace-pre-wrap">{rec}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mt-3">
          {(isAuthError || isFunctionMissing || isConnectionError) && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/supabase-connections')}
            >
              Check Supabase Connection
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
              variant="outline"
              onClick={() => window.open('https://docs.lovable.dev/setup#execute-migration', '_blank')}
            >
              Setup Guide <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}