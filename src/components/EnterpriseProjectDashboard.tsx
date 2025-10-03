import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Activity, 
  GitBranch, 
  Users, 
  Shield, 
  Code, 
  FileCode,
  TrendingUp,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { VersionHistory } from "./VersionHistory";
import { SnapshotManager } from "./SnapshotManager";
import { ModificationHistory } from "./ModificationHistory";
import { SelfHealingMonitor } from "./SelfHealingMonitor";
import { useProactiveMonitoring } from "@/hooks/useProactiveMonitoring";

interface EnterpriseProjectDashboardProps {
  projectId?: string;
  onCodeUpdate?: (code: string) => void;
}

export const EnterpriseProjectDashboard = ({ 
  projectId, 
  onCodeUpdate 
}: EnterpriseProjectDashboardProps) => {
  const { healthStatus, issuesCount, isHealthy } = useProactiveMonitoring(60);
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="space-y-4">
      {/* Status Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {isHealthy ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-destructive" />
              )}
              <span className="text-2xl font-bold">{healthStatus}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {issuesCount} active issues
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              Version Control
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Active</div>
            <p className="text-xs text-muted-foreground mt-1">
              Auto-save enabled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Code className="h-4 w-4" />
              Code Quality
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">A+</div>
            <p className="text-xs text-muted-foreground mt-1">
              No critical issues
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Secure</div>
            <p className="text-xs text-muted-foreground mt-1">
              All policies active
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCode className="h-5 w-5" />
            Enterprise Project Management
          </CardTitle>
          <CardDescription>
            Complete control over versions, snapshots, modifications, and system health
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="versions">
                <GitBranch className="h-4 w-4 mr-2" />
                Versions
              </TabsTrigger>
              <TabsTrigger value="snapshots">
                <Activity className="h-4 w-4 mr-2" />
                Snapshots
              </TabsTrigger>
              <TabsTrigger value="modifications">
                <Code className="h-4 w-4 mr-2" />
                Changes
              </TabsTrigger>
              <TabsTrigger value="health">
                <Shield className="h-4 w-4 mr-2" />
                Health
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span className="text-sm font-medium">Create Snapshot</span>
                      <Badge variant="secondary">Save State</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span className="text-sm font-medium">Compare Versions</span>
                      <Badge variant="secondary">Diff View</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span className="text-sm font-medium">Export Project</span>
                      <Badge variant="secondary">Download</Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-sm">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <span className="text-muted-foreground">System health check passed</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                        <span className="text-muted-foreground">Auto-save version created</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <div className="h-2 w-2 rounded-full bg-purple-500" />
                        <span className="text-muted-foreground">Code modifications applied</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="versions">
              {projectId && (
                <VersionHistory 
                  projectId={projectId} 
                  onRestore={(code) => onCodeUpdate?.(code)} 
                />
              )}
            </TabsContent>

            <TabsContent value="snapshots">
              <SnapshotManager />
            </TabsContent>

            <TabsContent value="modifications">
              <ModificationHistory />
            </TabsContent>

            <TabsContent value="health">
              <SelfHealingMonitor />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};