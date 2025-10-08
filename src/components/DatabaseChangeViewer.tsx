import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Database, Shield, Zap, AlertCircle, CheckCircle2,
  Copy, ExternalLink, Table, Code
} from "lucide-react";
import { toast } from "sonner";
import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css";
import "prismjs/components/prism-sql";
import { useEffect } from "react";

interface DatabaseChange {
  table: string;
  action: "create" | "alter" | "index";
  description: string;
}

interface SecurityPolicy {
  table: string;
  policies: string[];
}

interface DatabaseChangeViewerProps {
  operation: "create" | "modify" | "extend";
  reasoning: string;
  sql: string;
  tables: string[];
  changes?: DatabaseChange[];
  securityPolicies?: SecurityPolicy[];
  recommendations?: string[];
  onApply?: () => void;
  onReject?: () => void;
}

export function DatabaseChangeViewer({
  operation,
  reasoning,
  sql,
  tables,
  changes = [],
  securityPolicies = [],
  recommendations = [],
  onApply,
  onReject
}: DatabaseChangeViewerProps) {
  useEffect(() => {
    Prism.highlightAll();
  }, [sql]);

  const copySQL = () => {
    navigator.clipboard.writeText(sql);
    toast.success('SQL copied to clipboard');
  };

  const getOperationColor = () => {
    switch (operation) {
      case 'create': return 'text-green-500';
      case 'modify': return 'text-blue-500';
      case 'extend': return 'text-purple-500';
      default: return 'text-gray-500';
    }
  };

  const getOperationIcon = () => {
    switch (operation) {
      case 'create': return Database;
      case 'modify': return Zap;
      case 'extend': return Table;
      default: return Database;
    }
  };

  const OperationIcon = getOperationIcon();

  return (
    <Card className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg bg-primary/10 ${getOperationColor()}`}>
            <OperationIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-lg">Smart Database Changes</h3>
              <Badge variant="outline" className={`text-xs ${getOperationColor()}`}>
                {operation.toUpperCase()}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{reasoning}</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sql">SQL</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="recommendations">Tips</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Tables */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Table className="w-4 h-4" />
              <h4 className="font-semibold">Tables ({tables.length})</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {tables.map((table) => (
                <Badge key={table} variant="secondary">
                  {table}
                </Badge>
              ))}
            </div>
          </div>

          {/* Changes */}
          {changes.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4" />
                <h4 className="font-semibold">Changes ({changes.length})</h4>
              </div>
              <div className="space-y-2">
                {changes.map((change, i) => (
                  <Card key={i} className="p-3 bg-muted/50">
                    <div className="flex items-start gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {change.action}
                      </Badge>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{change.table}</div>
                        <div className="text-xs text-muted-foreground">
                          {change.description}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* SQL Tab */}
        <TabsContent value="sql">
          <div className="relative">
            <ScrollArea className="h-[400px] w-full rounded-md border">
              <pre className="text-xs p-4">
                <code className="language-sql">{sql}</code>
              </pre>
            </ScrollArea>
            <Button
              size="sm"
              variant="ghost"
              className="absolute top-2 right-2"
              onClick={copySQL}
            >
              <Copy className="w-3 h-3 mr-1" />
              Copy
            </Button>
          </div>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
          {securityPolicies.length > 0 ? (
            <>
              <div className="flex items-center gap-2 text-green-600 mb-3">
                <Shield className="w-4 h-4" />
                <span className="font-semibold">RLS Policies Enabled</span>
              </div>
              {securityPolicies.map((policy, i) => (
                <Card key={i} className="p-3 bg-muted/50">
                  <div className="font-medium text-sm mb-2">{policy.table}</div>
                  <div className="space-y-1">
                    {policy.policies.map((p, j) => (
                      <div key={j} className="flex items-start gap-2 text-xs">
                        <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5" />
                        <span className="text-muted-foreground">{p}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </>
          ) : (
            <div className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">No RLS policies defined</span>
            </div>
          )}
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-2">
          {recommendations.length > 0 ? (
            recommendations.map((rec, i) => (
              <Card key={i} className="p-3 bg-muted/50">
                <div className="flex items-start gap-2 text-sm">
                  <Code className="w-4 h-4 mt-0.5 text-primary" />
                  <span>{rec}</span>
                </div>
              </Card>
            ))
          ) : (
            <div className="text-sm text-muted-foreground text-center py-4">
              No additional recommendations
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open('/database-manager', '_blank')}
        >
          <ExternalLink className="w-3 h-3 mr-1" />
          View in Database Manager
        </Button>
        <div className="flex items-center gap-2">
          {onReject && (
            <Button variant="outline" size="sm" onClick={onReject}>
              Cancel
            </Button>
          )}
          {onApply && (
            <Button size="sm" onClick={onApply}>
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Apply Changes
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
