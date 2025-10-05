import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Terminal } from "lucide-react";

interface LogEntry {
  id: string;
  text: string;
  created: number;
  type: string;
  serial: number;
}

export const DeploymentLogsViewer = ({ deploymentId }: { deploymentId: string }) => {
  const { toast } = useToast();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, [deploymentId]);

  const loadLogs = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('vercel-logs', {
        body: { deploymentId },
      });

      if (error) throw error;

      if (data.success && data.logs) {
        // Parse and sort logs
        const parsedLogs = Array.isArray(data.logs) ? data.logs : [];
        setLogs(parsedLogs.sort((a: LogEntry, b: LogEntry) => a.serial - b.serial));
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getLogTypeColor = (type: string) => {
    switch (type) {
      case 'stdout':
        return 'text-foreground';
      case 'stderr':
        return 'text-red-500';
      case 'command':
        return 'text-blue-500';
      default:
        return 'text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card className="bg-background">
      <CardContent className="p-0">
        <div className="flex items-center gap-2 p-4 border-b">
          <Terminal className="h-4 w-4" />
          <span className="font-mono text-sm">Deployment Logs</span>
          <Badge variant="secondary" className="ml-auto">
            {logs.length} entries
          </Badge>
        </div>
        <ScrollArea className="h-[500px]">
          <div className="p-4 font-mono text-sm space-y-1">
            {logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No logs available for this deployment
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className={`${getLogTypeColor(log.type)}`}>
                  <span className="text-muted-foreground mr-2">
                    [{new Date(log.created).toLocaleTimeString()}]
                  </span>
                  {log.text}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};