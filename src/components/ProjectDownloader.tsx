import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2, FileArchive } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import JSZip from "jszip";

interface ProjectDownloaderProps {
  projectId: string;
  versionId?: string;
  projectTitle?: string;
}

export function ProjectDownloader({ projectId, versionId, projectTitle }: ProjectDownloaderProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadProject = async () => {
    try {
      setIsDownloading(true);
      toast.loading("Preparing download...", { id: 'download-toast' });

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) {
        throw new Error("Not authenticated");
      }

      const { data, error } = await supabase.functions.invoke("unified-code-operations", {
        body: {
          operation: 'download_project',
          params: {
            projectId,
            versionId
          }
        }
      });

      if (error) throw error;

      if (!data?.files || data.files.length === 0) {
        throw new Error("No files to download");
      }

      // Create ZIP file
      const zip = new JSZip();
      
      data.files.forEach((file: any) => {
        zip.file(file.path, file.content);
      });

      // Generate and download
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${projectTitle || 'project'}-v${data.versionNumber || '1'}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Downloaded ${data.files.length} files successfully!`, { id: 'download-toast' });
    } catch (error: any) {
      console.error("Download error:", error);
      toast.error(error.message || "Failed to download project", { id: 'download-toast' });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={downloadProject}
      disabled={isDownloading}
    >
      {isDownloading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Preparing...
        </>
      ) : (
        <>
          <Download className="w-4 h-4 mr-2" />
          Download ZIP
        </>
      )}
    </Button>
  );
}
