import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Database, AlertCircle, ExternalLink, Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

interface ConnectSupabaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected?: () => void;
  editConnection?: { id: string; project_name: string; supabase_url: string; supabase_anon_key?: string } | null;
}

export function ConnectSupabaseDialog({ open, onOpenChange, onConnected, editConnection }: ConnectSupabaseDialogProps) {
  const [projectName, setProjectName] = useState("");
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [anonKey, setAnonKey] = useState("");
  const [serviceRoleKey, setServiceRoleKey] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);

  // Populate form when editing
  useEffect(() => {
    if (editConnection) {
      setProjectName(editConnection.project_name);
      setSupabaseUrl(editConnection.supabase_url);
      setAnonKey(editConnection.supabase_anon_key || "");
      setServiceRoleKey("");
    } else {
      setProjectName("");
      setSupabaseUrl("");
      setAnonKey("");
      setServiceRoleKey("");
      setTestResults(null);
    }
  }, [editConnection]);

  const handleTestConnection = async () => {
    if (!supabaseUrl.trim() || !anonKey.trim()) {
      toast.error("Please enter URL and Anon Key first");
      return;
    }

    setIsTesting(true);
    setTestResults(null);

    try {
      const { data, error } = await supabase.functions.invoke('test-supabase-connection', {
        body: {
          supabaseUrl: supabaseUrl.trim(),
          supabaseAnonKey: anonKey.trim(),
          supabaseServiceRoleKey: serviceRoleKey.trim() || null
        }
      });

      if (error) throw error;

      setTestResults(data);

      if (data.success) {
        toast.success("Connection test successful!");
      } else {
        toast.error("Connection test failed - see details below");
      }
    } catch (error: any) {
      console.error("Test failed:", error);
      toast.error("Connection test failed");
      setTestResults({
        success: false,
        errors: [error.message || "Failed to test connection"],
        recommendations: ["Check your network connection and try again"]
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleConnect = async () => {
    if (!projectName.trim() || !supabaseUrl.trim() || !anonKey.trim() || !serviceRoleKey.trim()) {
      toast.error("Please fill in all required fields including Service Role Key");
      return;
    }

    // Basic validation
    if (!supabaseUrl.includes("supabase.co") && !supabaseUrl.includes("localhost")) {
      toast.error("Please enter a valid Supabase URL");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (editConnection) {
        // Update existing connection
        const { error } = await supabase
          .from("user_supabase_connections")
          .update({
            project_name: projectName.trim(),
            supabase_url: supabaseUrl.trim(),
            supabase_anon_key: anonKey.trim(),
            supabase_service_role_key: serviceRoleKey.trim(),
          })
          .eq("id", editConnection.id);

        if (error) throw error;
        toast.success("Supabase project updated successfully!");
      } else {
        // Create new connection
        const { error } = await supabase
          .from("user_supabase_connections")
          .insert({
            user_id: user.id,
            project_name: projectName.trim(),
            supabase_url: supabaseUrl.trim(),
            supabase_anon_key: anonKey.trim(),
            supabase_service_role_key: serviceRoleKey.trim(),
            is_active: true
          });

        if (error) throw error;
        toast.success("Supabase project connected successfully!");
      }

      onOpenChange(false);
      onConnected?.();

      // Reset form
      setProjectName("");
      setSupabaseUrl("");
      setAnonKey("");
      setServiceRoleKey("");
      setTestResults(null);
    } catch (error: any) {
      console.error("Failed to connect Supabase:", error);
      if (error.message.includes("unique")) {
        toast.error("A project with this name already exists");
      } else {
        toast.error(`Failed to ${editConnection ? 'update' : 'connect'} Supabase project`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            {editConnection ? 'Edit Supabase Project' : 'Connect Your Supabase Project'}
          </DialogTitle>
          <DialogDescription>
            {editConnection 
              ? 'Update your Supabase project connection details.'
              : 'Connect your own Supabase project to have full control over your generated website\'s backend.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Instructions */}
          <Alert>
            <AlertCircle className="w-4 h-4" />
            <AlertDescription className="text-sm space-y-2">
              <p>Don't have a Supabase project yet?</p>
              <Button
                variant="link"
                className="h-auto p-0 text-sm"
                onClick={() => window.open("https://supabase.com/dashboard/new", "_blank")}
              >
                Create one for free <ExternalLink className="w-3 h-3 ml-1" />
              </Button>
            </AlertDescription>
          </Alert>

          {/* Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project Name *</Label>
              <Input
                id="project-name"
                placeholder="my-awesome-website"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                A friendly name to identify this connection
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="supabase-url">Supabase Project URL *</Label>
              <Input
                id="supabase-url"
                placeholder="https://[your-project-id].supabase.co"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Format: https://[your-project-id].supabase.co - Find your project ID in Settings → General → Reference ID, or check your browser's address bar
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="anon-key">Anon Public Key *</Label>
              <Input
                id="anon-key"
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Find this in your Supabase project settings → API → anon public
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="service-role-key">Service Role Key *</Label>
              <Input
                id="service-role-key"
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={serviceRoleKey}
                onChange={(e) => setServiceRoleKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Required for creating database tables. Find in Settings → API → service_role
              </p>
            </div>

            {/* Test Results */}
            {testResults && (
              <Alert variant={testResults.success ? "default" : "destructive"}>
                {testResults.success ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                <AlertTitle>
                  {testResults.success ? "✅ Connection Successful" : testResults.requiresSetup ? "🔧 Setup Required" : "⚠️ Connection Issues"}
                </AlertTitle>
                <AlertDescription className="space-y-3 mt-2">
                  {testResults.errors?.length > 0 && (
                    <div className="space-y-1">
                      <p className="font-semibold text-sm">Errors:</p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {testResults.errors.map((err: string, i: number) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {testResults.requiresSetup && testResults.setupSQL && (
                    <div className="space-y-2 mt-3">
                      <p className="font-semibold text-sm flex items-center gap-2">
                        📋 One-Time Setup SQL:
                      </p>
                      <div className="relative">
                        <pre className="bg-muted/50 p-3 rounded-md text-xs overflow-x-auto max-h-48 border">
                          <code>{testResults.setupSQL}</code>
                        </pre>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="absolute top-2 right-2"
                          onClick={() => {
                            navigator.clipboard.writeText(testResults.setupSQL);
                            toast.success("✅ SQL Copied! Paste it in your Supabase SQL Editor");
                          }}
                        >
                          📋 Copy SQL
                        </Button>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
                      >
                        Open Supabase Dashboard →
                      </Button>
                    </div>
                  )}
                  
                  {testResults.warnings?.length > 0 && (
                    <div className="space-y-1">
                      <p className="font-semibold text-sm flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Warnings:
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {testResults.warnings.map((warn: string, i: number) => (
                          <li key={i}>{warn}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {testResults.recommendations?.length > 0 && (
                    <div className="space-y-1">
                      <p className="font-semibold text-sm">Steps:</p>
                      <ol className="list-decimal list-inside space-y-1 text-sm">
                        {testResults.recommendations.map((rec: string, i: number) => (
                          <li key={i} className="whitespace-pre-wrap">{rec}</li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {testResults.success && (
                    <p className="text-sm text-muted-foreground mt-2">
                      ✓ URL Valid | ✓ Anon Key Valid | {testResults.serviceRoleKeyValid ? '✓' : '⚠'} Service Role Key | {testResults.canCreateTables ? '✓ Ready for Database Operations' : '⚠ Limited Features'}
                    </p>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-between gap-2 pt-4">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={isSubmitting || isTesting}
            >
              {isTesting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isTesting ? "Testing..." : "Test Connection"}
            </Button>
            <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConnect}
              disabled={isSubmitting || isTesting || (testResults && !testResults.success)}
            >
              {isSubmitting ? (editConnection ? "Updating..." : "Connecting...") : testResults?.requiresSetup ? "⚠️ Complete Setup First" : (editConnection ? "Update Project" : "Connect Project")}
            </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
