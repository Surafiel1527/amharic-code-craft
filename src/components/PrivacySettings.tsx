import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Lock, Eye, EyeOff, Share2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PrivacySettingsProps {
  projectId: string;
  onUpdate: () => void;
}

export const PrivacySettings = ({ projectId, onUpdate }: PrivacySettingsProps) => {
  const [isPublic, setIsPublic] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, [projectId]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("is_public, share_token")
        .eq("id", projectId)
        .single();

      if (error) throw error;

      setIsPublic(data.is_public || false);
      setShareToken(data.share_token);
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("ቅንብሮችን መጫን አልተቻለም");
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePublic = async () => {
    setSaving(true);
    try {
      let newShareToken = shareToken;
      
      // Generate share token if making public and doesn't have one
      if (!isPublic && !shareToken) {
        const { data, error: tokenError } = await supabase
          .rpc('generate_share_token');
        
        if (tokenError) throw tokenError;
        newShareToken = data;
      }

      const { error } = await supabase
        .from("projects")
        .update({ 
          is_public: !isPublic,
          share_token: newShareToken
        })
        .eq("id", projectId);

      if (error) throw error;

      setIsPublic(!isPublic);
      setShareToken(newShareToken);
      toast.success(!isPublic ? "ፕሮጀክት ይፋ ሆነ" : "ፕሮጀክት የግል ሆነ");
      onUpdate();
    } catch (error) {
      console.error("Error updating privacy:", error);
      toast.error("ስህተት ተከስቷል");
    } finally {
      setSaving(false);
    }
  };

  const copyShareLink = () => {
    if (shareToken) {
      const shareUrl = `${window.location.origin}/shared/${shareToken}`;
      navigator.clipboard.writeText(shareUrl);
      toast.success("አገናኝ ተቀድቷል!");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-pulse">መረጃ እየተጫነ ነው...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="w-5 h-5" />
          የግላዊነት እና የማጋራት ቅንብሮች
        </CardTitle>
        <CardDescription>
          ፕሮጀክትዎን ማን ማየት እና መድረስ እንደሚችል ይቆጣጠሩ
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Public/Private Toggle */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="space-y-0.5">
            <Label className="text-base font-semibold flex items-center gap-2">
              {isPublic ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              {isPublic ? "ይፋ ፕሮጀክት" : "የግል ፕሮጀክት"}
            </Label>
            <p className="text-sm text-muted-foreground">
              {isPublic 
                ? "ማንኛውም ሰው ይህንን ፕሮጀክት ማየት ይችላል"
                : "እርስዎ ብቻ ይህንን ፕሮጀክት ማየት ይችላሉ"
              }
            </p>
          </div>
          <Switch
            checked={isPublic}
            onCheckedChange={handleTogglePublic}
            disabled={saving}
          />
        </div>

        {/* Share Link Section */}
        {isPublic && shareToken && (
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              የማጋሪያ አገናኝ
            </Label>
            <div className="flex gap-2">
              <input
                type="text"
                value={`${window.location.origin}/shared/${shareToken}`}
                readOnly
                className="flex-1 px-3 py-2 bg-muted rounded-md text-sm"
              />
              <Button onClick={copyShareLink} variant="outline">
                ቅዳ
              </Button>
            </div>
          </div>
        )}

        {/* Privacy Information */}
        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg space-y-2">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <Users className="w-4 h-4" />
            የግላዊነት መረጃ
          </h4>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>የግል ፕሮጀክቶች እርስዎ ብቻ ይመለከቷቸዋል</li>
            <li>የይፋ ፕሮጀክቶች በማግኘት ገፅ ላይ ይታያሉ</li>
            <li>የማጋሪያ አገናኞች ሊሰረዙ ይችላሉ በግላዊነት ሲቀየር</li>
            <li>ሁሉም ፕሮጀክቶች በእርስዎ መለያ ውስጥ ይቀመጣሉ</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
