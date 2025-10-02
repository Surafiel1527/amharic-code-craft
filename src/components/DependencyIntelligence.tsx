import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Package, Loader2, Plus, Minus, AlertTriangle, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DependencyIntelligenceProps {
  code?: string;
  projectId?: string;
}

export const DependencyIntelligence = ({ code: initialCode = "", projectId }: DependencyIntelligenceProps) => {
  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [audit, setAudit] = useState<any>(null);

  const handleAudit = async () => {
    if (!code.trim()) {
      toast.error("Please provide code to audit");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('audit-dependencies', {
        body: { code, projectId, currentPackages: [] }
      });

      if (error) throw error;

      setAudit(data);
      toast.success(`Audit complete - Score: ${data.auditScore}/100`);
    } catch (error) {
      console.error('Dependency audit error:', error);
      toast.error(error instanceof Error ? error.message : "Failed to audit dependencies");
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <Card className="glass-effect border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Dependency Intelligence
        </CardTitle>
        <CardDescription>
          Analyze and optimize your project dependencies
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Paste your code here to analyze dependencies..."
          className="min-h-[200px] font-mono text-sm"
        />

        <Button 
          onClick={handleAudit} 
          disabled={loading || !code.trim()}
          className="w-full"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Run Dependency Audit
        </Button>

        {audit && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <span className="font-semibold">Audit Score</span>
              <Badge variant={audit.auditScore >= 80 ? 'default' : audit.auditScore >= 60 ? 'secondary' : 'destructive'} className="text-lg">
                {audit.auditScore}/100
              </Badge>
            </div>

            {audit.suggestedAdditions?.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Suggested Additions
                </h4>
                <ScrollArea className="max-h-[200px]">
                  {audit.suggestedAdditions.map((pkg: any, idx: number) => (
                    <div key={idx} className="p-3 mb-2 rounded-lg border bg-card">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{pkg.name}</p>
                          <p className="text-sm text-muted-foreground">{pkg.reason}</p>
                        </div>
                        <Badge variant="outline">{pkg.priority}</Badge>
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            )}

            {audit.suggestedRemovals?.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Minus className="h-4 w-4" />
                  Suggested Removals
                </h4>
                <ScrollArea className="max-h-[200px]">
                  {audit.suggestedRemovals.map((pkg: any, idx: number) => (
                    <div key={idx} className="p-3 mb-2 rounded-lg border bg-card">
                      <p className="font-medium">{pkg.name}</p>
                      <p className="text-sm text-muted-foreground">{pkg.reason}</p>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            )}

            {audit.securityIssues?.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Security Issues
                </h4>
                <ScrollArea className="max-h-[200px]">
                  {audit.securityIssues.map((issue: any, idx: number) => (
                    <Alert key={idx} variant="destructive" className="mb-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{issue.package}</p>
                            <p className="text-sm">{issue.issue}</p>
                          </div>
                          <Badge variant={getSeverityColor(issue.severity)}>
                            {issue.severity}
                          </Badge>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </ScrollArea>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};