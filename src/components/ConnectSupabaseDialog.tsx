import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Database, AlertCircle, ExternalLink } from "lucide-react";

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
    }
  }, [editConnection]);

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
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConnect}
              disabled={isSubmitting}
            >
              {isSubmitting ? (editConnection ? "Updating..." : "Connecting...") : (editConnection ? "Update Project" : "Connect Project")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
