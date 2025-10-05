import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Code2, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export function CronJobSetup() {
  const cronJobSQL = `-- Enable pg_cron extension (run once)
SELECT cron.schedule(
  'database-health-monitoring',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT
    net.http_post(
        url:='${import.meta.env.VITE_SUPABASE_URL}/functions/v1/proactive-health-monitor',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(cronJobSQL);
    toast.success('SQL copied to clipboard');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code2 className="h-5 w-5" />
          Automated Health Monitoring Setup
        </CardTitle>
        <CardDescription>
          Configure scheduled health checks using Supabase Cron
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-muted rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">SQL Cron Job</h4>
            <Button variant="outline" size="sm" onClick={copyToClipboard}>
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
          </div>
          
          <pre className="text-xs overflow-x-auto p-3 bg-background rounded border">
            <code>{cronJobSQL}</code>
          </pre>
        </div>

        <div className="space-y-2">
          <h4 className="font-semibold">Setup Instructions:</h4>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Open your Lovable Cloud backend SQL editor</li>
            <li>Copy and paste the SQL code above</li>
            <li>Execute the query to schedule automated health checks</li>
            <li>Health checks will run every 5 minutes automatically</li>
            <li>View results in the Monitoring Dashboard</li>
          </ol>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" asChild className="flex-1">
            <a href="https://docs.lovable.dev" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Documentation
            </a>
          </Button>
        </div>

        <div className="p-3 border rounded-lg bg-blue-50 dark:bg-blue-950">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <strong>Pro Tip:</strong> Adjust the cron schedule (*/5 * * * *) to control frequency. 
            Use */15 for every 15 minutes, */30 for every 30 minutes, etc.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
