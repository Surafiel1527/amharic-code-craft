import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { VercelDeploymentManager } from "@/components/VercelDeploymentManager";
import { Rocket, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const Deploy = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [projectName, setProjectName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProject = async () => {
      if (!projectId) {
        toast.error("No project ID provided");
        navigate("/");
        return;
      }

      try {
        const { data, error } = await supabase
          .from("projects")
          .select("title")
          .eq("id", projectId)
          .single();

        if (error) throw error;
        if (data) {
          setProjectName(data.title);
        }
      } catch (error) {
        console.error("Error loading project:", error);
        toast.error("Failed to load project");
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [projectId, navigate]);

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center">
          <p>Loading project...</p>
        </div>
      </div>
    );
  }

  if (!projectId) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Button
        variant="ghost"
        onClick={() => navigate(`/workspace/${projectId}`)}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Workspace
      </Button>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-3xl">
            <Rocket className="h-8 w-8" />
            Deploy {projectName}
          </CardTitle>
          <CardDescription className="text-lg">
            Deploy your application to production with one click via Vercel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Features:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>One-click deployment to Vercel</li>
                <li>Automatic SSL certificates</li>
                <li>Global CDN distribution</li>
                <li>Environment variables management</li>
                <li>Real-time deployment logs</li>
                <li>Deployment history tracking</li>
              </ul>
            </div>

            <VercelDeploymentManager 
              projectId={projectId} 
              projectName={projectName}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Deploy;