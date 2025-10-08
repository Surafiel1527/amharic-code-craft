import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Database, Plus, Trash2, ExternalLink, CheckCircle2, Pencil } from "lucide-react";
import { ConnectSupabaseDialog } from "./ConnectSupabaseDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SupabaseConnection {
  id: string;
  project_name: string;
  supabase_url: string;
  supabase_anon_key?: string;
  is_active: boolean;
  created_at: string;
}

export function SupabaseConnectionsManager() {
  const [connections, setConnections] = useState<SupabaseConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [editingConnection, setEditingConnection] = useState<SupabaseConnection | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadConnections = async () => {
    try {
      const { data, error } = await supabase
        .from("user_supabase_connections")
        .select("id, project_name, supabase_url, supabase_anon_key, is_active, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setConnections(data || []);
    } catch (error) {
      console.error("Failed to load connections:", error);
      toast.error("Failed to load Supabase connections");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConnections();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("user_supabase_connections")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Connection removed successfully");
      loadConnections();
    } catch (error) {
      console.error("Failed to delete connection:", error);
      toast.error("Failed to remove connection");
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleSetActive = async (id: string) => {
    try {
      // Deactivate all connections first
      await supabase
        .from("user_supabase_connections")
        .update({ is_active: false })
        .neq("id", "00000000-0000-0000-0000-000000000000");

      // Activate the selected one
      const { error } = await supabase
        .from("user_supabase_connections")
        .update({ is_active: true })
        .eq("id", id);

      if (error) throw error;

      toast.success("Active connection updated");
      loadConnections();
    } catch (error) {
      console.error("Failed to set active connection:", error);
      toast.error("Failed to update active connection");
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">Loading connections...</div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Database className="w-5 h-5" />
              Your Supabase Projects
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Connect your Supabase projects to generate full-stack websites
            </p>
          </div>
          <Button onClick={() => setShowConnectDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Connect Project
          </Button>
        </div>

        {connections.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <Database className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-lg font-medium mb-2">No Supabase projects connected</p>
            <p className="text-sm text-muted-foreground mb-4">
              Connect your Supabase project to start generating full-stack websites
            </p>
            <Button onClick={() => setShowConnectDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Connect Your First Project
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {connections.map((connection) => (
              <Card key={connection.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold">{connection.project_name}</h4>
                      {connection.is_active && (
                        <Badge variant="default" className="text-xs">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{connection.supabase_url}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0"
                        onClick={() => window.open(connection.supabase_url, "_blank")}
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Connected {new Date(connection.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!connection.is_active && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetActive(connection.id)}
                      >
                        Set Active
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 touch-manipulation"
                      onClick={() => setEditingConnection(connection)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 touch-manipulation"
                      onClick={() => setDeleteConfirm(connection.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      <ConnectSupabaseDialog
        open={showConnectDialog || !!editingConnection}
        onOpenChange={(open) => {
          setShowConnectDialog(open);
          if (!open) setEditingConnection(null);
        }}
        onConnected={loadConnections}
        editConnection={editingConnection}
      />

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Supabase Connection?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the connection from your account. Any websites using this connection
              will stop working until you reconnect or update them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
