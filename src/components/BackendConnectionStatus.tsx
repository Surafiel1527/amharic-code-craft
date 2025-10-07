import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Database, ExternalLink, AlertCircle, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BackendConnectionStatusProps {
  showFullCard?: boolean;
  className?: string;
}

export function BackendConnectionStatus({ showFullCard = false, className = "" }: BackendConnectionStatusProps) {
  const [connection, setConnection] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadConnection();
  }, []);

  const loadConnection = async () => {
    try {
      const { data, error } = await supabase
        .from("user_supabase_connections")
        .select("*")
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      setConnection(data);
    } catch (error) {
      console.error("Failed to load connection:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return null;

  // Badge only version
  if (!showFullCard) {
    return (
      <Badge
        variant={connection ? "default" : "secondary"}
        className={`gap-1 cursor-pointer ${className}`}
        onClick={() => navigate("/supabase-connections")}
      >
        <Database className="w-3 h-3" />
        {connection ? connection.project_name : "Platform DB"}
      </Badge>
    );
  }

  // Full card version
  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${connection ? 'bg-primary/10' : 'bg-muted'}`}>
          <Database className={`w-5 h-5 ${connection ? 'text-primary' : 'text-muted-foreground'}`} />
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm">Backend Connection</h4>
            {connection ? (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-500" />
            )}
          </div>
          
          {connection ? (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                Connected to: <span className="font-medium text-foreground">{connection.project_name}</span>
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={() => window.open(connection.supabase_url, "_blank")}
                >
                  Open Dashboard <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
                <span className="text-muted-foreground">•</span>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={() => navigate("/supabase-connections")}
                >
                  Manage
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Using platform database. For full control over your backend:
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/supabase-connections")}
              >
                Connect Your Supabase
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
