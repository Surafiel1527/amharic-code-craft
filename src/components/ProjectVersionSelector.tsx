import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, Code2, Download, Eye, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface ProjectVersion {
  id: string;
  project_id: string;
  version_number: number;
  html_code: string;
  changes_summary: string;
  performance_score: number;
  quality_score: number;
  created_at: string;
}

interface ProjectVersionSelectorProps {
  projectId: string;
  currentVersion?: number;
  onVersionChange: (versionId: string, versionNumber: number) => void;
  onPreview: (versionId: string) => void;
  onDownload: (versionId: string) => void;
}

export function ProjectVersionSelector({
  projectId,
  currentVersion,
  onVersionChange,
  onPreview,
  onDownload
}: ProjectVersionSelectorProps) {
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadVersions();
  }, [projectId]);

  const loadVersions = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("project_versions")
        .select("*")
        .eq("project_id", projectId)
        .order("version_number", { ascending: false });

      if (error) throw error;

      setVersions(data || []);
      
      // Select latest version by default
      if (data && data.length > 0) {
        setSelectedVersion(data[0].id);
      }
    } catch (error) {
      console.error("Error loading versions:", error);
      toast.error("Failed to load version history");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVersionSelect = (versionId: string) => {
    setSelectedVersion(versionId);
    const version = versions.find(v => v.id === versionId);
    if (version) {
      onVersionChange(versionId, version.version_number);
      toast.success(`Switched to Version ${version.version_number}`);
    }
  };

  const handleRestore = async (versionId: string) => {
    try {
      const version = versions.find(v => v.id === versionId);
      if (!version) return;

      // Update project with this version's code
      await supabase
        .from("projects")
        .update({ 
          html_code: version.html_code,
          updated_at: new Date().toISOString()
        })
        .eq("id", projectId);

      toast.success(`Restored to Version ${version.version_number}`);
      window.location.reload(); // Reload to show restored version
    } catch (error) {
      console.error("Error restoring version:", error);
      toast.error("Failed to restore version");
    }
  };

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="text-sm text-muted-foreground">Loading versions...</div>
      </Card>
    );
  }

  if (versions.length === 0) {
    return (
      <Card className="p-4">
        <div className="text-sm text-muted-foreground">No versions yet</div>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Version History
        </h3>
        <Badge variant="outline">{versions.length} versions</Badge>
      </div>

      <Select value={selectedVersion} onValueChange={handleVersionSelect}>
        <SelectTrigger className="bg-background">
          <SelectValue placeholder="Select version" />
        </SelectTrigger>
        <SelectContent className="bg-popover z-50">
          {versions.map((version) => (
            <SelectItem key={version.id} value={version.id} className="cursor-pointer">
              <div className="flex items-center gap-2">
                <span className="font-medium">v{version.version_number}</span>
                {version.version_number === currentVersion && (
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                )}
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(version.created_at), { addSuffix: true })}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedVersion && (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onPreview(selectedVersion)}
            className="flex-1"
          >
            <Eye className="w-3 h-3 mr-1" />
            Preview
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDownload(selectedVersion)}
            className="flex-1"
          >
            <Download className="w-3 h-3 mr-1" />
            Download
          </Button>
          <Button
            size="sm"
            variant="default"
            onClick={() => handleRestore(selectedVersion)}
            className="flex-1"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Restore
          </Button>
        </div>
      )}
    </Card>
  );
}
