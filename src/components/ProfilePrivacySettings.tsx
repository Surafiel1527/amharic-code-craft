import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Shield, Eye, EyeOff, Users, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export const ProfilePrivacySettings = () => {
  const { user } = useAuth();
  const [visibility, setVisibility] = useState<string>("public");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchPrivacySettings();
    }
  }, [user]);

  const fetchPrivacySettings = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("profile_visibility")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;
      
      // If no profile exists yet, create one with upsert
      if (!data) {
        const { error: upsertError } = await supabase
          .from("profiles")
          .upsert({
            id: user.id,
            profile_visibility: "public",
            email: user.email,
            full_name: user.user_metadata?.full_name || "",
          }, {
            onConflict: 'id'
          });
        
        if (upsertError) throw upsertError;
        setVisibility("public");
      } else {
        setVisibility(data.profile_visibility || "public");
      }
    } catch (error) {
      console.error("Error fetching privacy settings:", error);
      toast.error("Failed to load privacy settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSavePrivacy = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      // Use upsert to handle both insert and update
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          profile_visibility: visibility,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id'
        });

      if (error) throw error;

      toast.success("Privacy settings updated successfully");
    } catch (error) {
      console.error("Error updating privacy:", error);
      toast.error("Failed to update privacy settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-pulse">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Profile Privacy Settings
        </CardTitle>
        <CardDescription>
          Control who can view your profile information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <RadioGroup value={visibility} onValueChange={setVisibility}>
          <div className="flex items-start space-x-3 p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
            <RadioGroupItem value="public" id="public" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="public" className="cursor-pointer">
                <div className="flex items-center gap-2 font-semibold mb-1">
                  <Eye className="w-4 h-4" />
                  Public Profile
                </div>
                <p className="text-sm text-muted-foreground font-normal">
                  Anyone can view your profile (except your email address)
                </p>
              </Label>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
            <RadioGroupItem value="authenticated" id="authenticated" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="authenticated" className="cursor-pointer">
                <div className="flex items-center gap-2 font-semibold mb-1">
                  <Users className="w-4 h-4" />
                  Authenticated Users Only
                </div>
                <p className="text-sm text-muted-foreground font-normal">
                  Only logged-in users can view your profile
                </p>
              </Label>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
            <RadioGroupItem value="private" id="private" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="private" className="cursor-pointer">
                <div className="flex items-center gap-2 font-semibold mb-1">
                  <EyeOff className="w-4 h-4" />
                  Private Profile
                </div>
                <p className="text-sm text-muted-foreground font-normal">
                  Only you can view your profile
                </p>
              </Label>
            </div>
          </div>
        </RadioGroup>

        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg space-y-2">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Privacy Information
          </h4>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Your email address is NEVER visible to other users</li>
            <li>Public profiles appear in search and explore pages</li>
            <li>Private profiles are only visible to you</li>
            <li>You can change these settings at any time</li>
          </ul>
        </div>

        <Button 
          onClick={handleSavePrivacy} 
          disabled={saving}
          className="w-full"
        >
          {saving ? "Saving..." : "Save Privacy Settings"}
        </Button>
      </CardContent>
    </Card>
  );
};
