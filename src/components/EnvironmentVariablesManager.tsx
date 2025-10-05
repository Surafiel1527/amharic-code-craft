import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface EnvVar {
  id: string;
  key: string;
  value: string;
  target: string[];
}

export const EnvironmentVariablesManager = ({ projectId }: { projectId: string }) => {
  const { toast } = useToast();
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newTarget, setNewTarget] = useState<string[]>(['production']);
  const [showValues, setShowValues] = useState<{ [key: string]: boolean }>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadEnvVars();
  }, [projectId]);

  const loadEnvVars = async () => {
    try {
      const { data, error } = await supabase
        .from('project_environment_variables')
        .select('*')
        .eq('project_id', projectId);

      if (error) throw error;
      setEnvVars(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addEnvVar = async () => {
    if (!newKey.trim() || !newValue.trim()) {
      toast({
        title: "Error",
        description: "Key and value are required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('project_environment_variables')
        .insert({
          project_id: projectId,
          user_id: user.id,
          key: newKey,
          value: newValue,
          target: newTarget,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Environment variable added",
      });

      setNewKey("");
      setNewValue("");
      setNewTarget(['production']);
      loadEnvVars();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteEnvVar = async (id: string) => {
    try {
      const { error } = await supabase
        .from('project_environment_variables')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Environment variable deleted",
      });

      loadEnvVars();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleShowValue = (id: string) => {
    setShowValues(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleTarget = (target: string) => {
    setNewTarget(prev =>
      prev.includes(target)
        ? prev.filter(t => t !== target)
        : [...prev, target]
    );
  };

  if (isLoading) {
    return <div className="text-center py-4">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="key">Key</Label>
            <Input
              id="key"
              placeholder="API_KEY"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="value">Value</Label>
            <Input
              id="value"
              type="password"
              placeholder="secret_value"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Target Environments</Label>
            <div className="flex gap-4">
              {['production', 'preview', 'development'].map((target) => (
                <div key={target} className="flex items-center space-x-2">
                  <Checkbox
                    id={target}
                    checked={newTarget.includes(target)}
                    onCheckedChange={() => toggleTarget(target)}
                  />
                  <label
                    htmlFor={target}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize"
                  >
                    {target}
                  </label>
                </div>
              ))}
            </div>
          </div>
          <Button onClick={addEnvVar} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Add Variable
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {envVars.map((envVar) => (
          <Card key={envVar.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium">{envVar.key}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-sm text-muted-foreground">
                      {showValues[envVar.id] ? envVar.value : '••••••••'}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleShowValue(envVar.id)}
                    >
                      {showValues[envVar.id] ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <div className="flex gap-1 mt-2">
                    {envVar.target.map((t) => (
                      <Badge key={t} variant="secondary" className="text-xs">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteEnvVar(envVar.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {envVars.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No environment variables yet
          </div>
        )}
      </div>
    </div>
  );
};