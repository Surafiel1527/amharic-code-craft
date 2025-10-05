import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Key, Eye, EyeOff, Trash2, RotateCw, Plus, Copy } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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

interface APIKey {
  id: string;
  key_name: string;
  api_key: string;
  is_active: boolean;
  usage_count: number;
  last_used_at: string | null;
  last_rotated_at: string;
  created_at: string;
  expires_at: string | null;
}

export const SecureAPIKeyManager = () => {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [newKeyName, setNewKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null);

  useEffect(() => {
    fetchAPIKeys();
  }, []);

  const fetchAPIKeys = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("api_keys")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setApiKeys(data || []);
    } catch (error) {
      console.error("Error fetching API keys:", error);
      toast.error("Failed to load API keys");
    } finally {
      setLoading(false);
    }
  };

  const generateSecureKey = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
  };

  const createAPIKey = async () => {
    if (!newKeyName.trim()) {
      toast.error("Please enter a key name");
      return;
    }

    try {
      setCreating(true);
      const newKey = generateSecureKey();
      const { data: user } = await supabase.auth.getUser();

      if (!user.user) throw new Error("Not authenticated");

      const { error } = await supabase.from("api_keys").insert({
        user_id: user.user.id,
        key_name: newKeyName,
        api_key: newKey,
        encrypted: true,
        last_rotated_at: new Date().toISOString(),
      });

      if (error) throw error;

      // Log audit event
      await supabase.rpc("log_audit_event", {
        p_user_id: user.user.id,
        p_action: "create_api_key",
        p_resource_type: "api_key",
        p_severity: "info",
      });

      toast.success("API key created successfully");
      setNewKeyName("");
      fetchAPIKeys();
    } catch (error) {
      console.error("Error creating API key:", error);
      toast.error("Failed to create API key");
    } finally {
      setCreating(false);
    }
  };

  const rotateAPIKey = async (keyId: string) => {
    try {
      const newKey = generateSecureKey();
      const { data: user } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("api_keys")
        .update({
          api_key: newKey,
          last_rotated_at: new Date().toISOString(),
        })
        .eq("id", keyId);

      if (error) throw error;

      // Log audit event
      await supabase.rpc("log_audit_event", {
        p_user_id: user.user?.id,
        p_action: "rotate_api_key",
        p_resource_type: "api_key",
        p_resource_id: keyId,
        p_severity: "warning",
      });

      toast.success("API key rotated successfully");
      fetchAPIKeys();
    } catch (error) {
      console.error("Error rotating API key:", error);
      toast.error("Failed to rotate API key");
    }
  };

  const deleteAPIKey = async (keyId: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();

      const { error } = await supabase.from("api_keys").delete().eq("id", keyId);

      if (error) throw error;

      // Log audit event
      await supabase.rpc("log_audit_event", {
        p_user_id: user.user?.id,
        p_action: "delete_api_key",
        p_resource_type: "api_key",
        p_resource_id: keyId,
        p_severity: "warning",
      });

      toast.success("API key deleted");
      setDeleteDialog(null);
      fetchAPIKeys();
    } catch (error) {
      console.error("Error deleting API key:", error);
      toast.error("Failed to delete API key");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const toggleKeyVisibility = (keyId: string) => {
    setShowKey((prev) => ({ ...prev, [keyId]: !prev[keyId] }));
  };

  const maskKey = (key: string) => {
    return `${key.substring(0, 8)}${"*".repeat(48)}${key.substring(56)}`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Create New API Key
          </CardTitle>
          <CardDescription>
            Generate encrypted API keys with automatic rotation support
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="keyName">Key Name</Label>
              <Input
                id="keyName"
                placeholder="e.g., Production API Key"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={createAPIKey} disabled={creating}>
                <Plus className="h-4 w-4 mr-2" />
                Create Key
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your API Keys</CardTitle>
          <CardDescription>Manage and rotate your encrypted API keys</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {apiKeys.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Key className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No API keys created yet</p>
              </div>
            ) : (
              apiKeys.map((key) => (
                <Card key={key.id} className="border-2">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{key.key_name}</h4>
                            {key.is_active ? (
                              <Badge variant="outline" className="text-success">Active</Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Used {key.usage_count} times
                            {key.last_used_at && ` • Last used ${new Date(key.last_used_at).toLocaleString()}`}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => rotateAPIKey(key.id)}
                          >
                            <RotateCw className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDeleteDialog(key.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 bg-muted p-3 rounded-md">
                        <code className="flex-1 text-xs font-mono">
                          {showKey[key.id] ? key.api_key : maskKey(key.api_key)}
                        </code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleKeyVisibility(key.id)}
                        >
                          {showKey[key.id] ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(key.api_key)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>Created: {new Date(key.created_at).toLocaleDateString()}</span>
                        <span>Last rotated: {new Date(key.last_rotated_at).toLocaleDateString()}</span>
                        {key.expires_at && (
                          <span>Expires: {new Date(key.expires_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete API Key</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Any services using this key will stop working.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDialog && deleteAPIKey(deleteDialog)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
