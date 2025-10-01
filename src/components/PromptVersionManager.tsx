import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, CheckCircle2, Settings } from "lucide-react";

interface PromptVersion {
  id: string;
  version: string;
  traffic_percentage: number;
  success_rate: number | null;
  total_uses: number;
  average_satisfaction: number | null;
  created_at: string;
}

export const PromptVersionManager = () => {
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchVersions();
  }, []);

  const fetchVersions = async () => {
    const { data } = await supabase
      .from('prompt_versions')
      .select('id, version, traffic_percentage, success_rate, total_uses, average_satisfaction, created_at')
      .order('created_at', { ascending: false });
    
    if (data) setVersions(data);
    setLoading(false);
  };

  const updateTraffic = async (versionId: string, newPercentage: number) => {
    const { error } = await supabase
      .from('prompt_versions')
      .update({ traffic_percentage: newPercentage })
      .eq('id', versionId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Traffic Updated",
      description: `Traffic allocation set to ${newPercentage}%`,
    });

    fetchVersions();
  };

  const activateVersion = async (versionId: string) => {
    // Set this version to 100% traffic, others to 0%
    const updates = versions.map(v => ({
      id: v.id,
      traffic_percentage: v.id === versionId ? 100 : 0
    }));

    for (const update of updates) {
      await supabase
        .from('prompt_versions')
        .update({ traffic_percentage: update.traffic_percentage })
        .eq('id', update.id);
    }

    toast({
      title: "Version Activated",
      description: "This version is now receiving 100% of traffic",
    });

    fetchVersions();
  };

  const getTotalTraffic = () => {
    return versions.reduce((sum, v) => sum + v.traffic_percentage, 0);
  };

  const totalTraffic = getTotalTraffic();
  const isValidTraffic = totalTraffic === 100;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">A/B Testing Manager</h3>
          <p className="text-muted-foreground">Manage traffic distribution across prompt versions</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Total Traffic:</span>
          <Badge variant={isValidTraffic ? "default" : "destructive"}>
            {totalTraffic}%
          </Badge>
        </div>
      </div>

      {!isValidTraffic && (
        <Card className="border-destructive">
          <CardContent className="p-4">
            <p className="text-sm text-destructive">
              ⚠️ Warning: Total traffic must equal 100%. Current: {totalTraffic}%
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {versions.map((version) => (
          <Card key={version.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {version.version}
                    {version.traffic_percentage === 100 && (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                  </CardTitle>
                  <CardDescription>
                    {version.total_uses} generations · {version.success_rate?.toFixed(1) || 0}% success
                    {version.average_satisfaction && ` · ${version.average_satisfaction.toFixed(1)}/5 rating`}
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => activateVersion(version.id)}
                  disabled={version.traffic_percentage === 100}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Activate
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium w-20">Traffic:</span>
                  <Slider
                    value={[version.traffic_percentage]}
                    onValueChange={([value]) => updateTraffic(version.id, value)}
                    max={100}
                    step={5}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium w-12 text-right">
                    {version.traffic_percentage}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
