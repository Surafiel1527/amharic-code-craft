import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface SecretsRequiredModalProps {
  open: boolean;
  resources: any[];
  onComplete: () => void;
  onCancel: () => void;
  conversationId: string;
}

export function SecretsRequiredModal({ open, resources, onComplete, onCancel }: SecretsRequiredModalProps) {
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save secrets via edge function
      await supabase.functions.invoke('unified-resource-manager', {
        body: { operation: 'save_secrets', secrets }
      });
      toast.success("✅ Secrets saved! Continuing generation...");
      onComplete();
    } catch (error) {
      toast.error("Failed to save secrets");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <DialogTitle>External Service Configuration</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {resources.map((resource) => (
            <div key={resource.id} className="space-y-3 border-b pb-4">
              <h3 className="font-semibold">{resource.name}</h3>
              {resource.secrets.map((secret: any) => (
                <div key={secret.name} className="space-y-2">
                  <Label>{secret.displayName}</Label>
                  <div className="flex gap-2">
                    <Input
                      type={showSecrets[secret.name] ? "text" : "password"}
                      placeholder={secret.example || `Enter ${secret.displayName}`}
                      value={secrets[secret.name] || ""}
                      onChange={(e) => setSecrets({ ...secrets, [secret.name]: e.target.value })}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setShowSecrets({ ...showSecrets, [secret.name]: !showSecrets[secret.name] })}
                    >
                      {showSecrets[secret.name] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">{secret.location}</p>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Continue →"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
