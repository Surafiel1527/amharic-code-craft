import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CompletePipelineDashboard } from "@/components/CompletePipelineDashboard";
import { Rocket, ArrowLeft, FolderOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Project {
  id: string;
  title: string;
  html_code: string;
  created_at: string;
}

const Deploy = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [projectName, setProjectName] = useState<string>("");
  const [projectFiles, setProjectFiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const { data, error } = await supabase
          .from("projects")
          .select("id, title, html_code, created_at")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setProjects(data || []);
      } catch (error) {
        console.error("Error loading projects:", error);
        toast.error("Failed to load projects");
      } finally {
        setLoading(false);
      }
    };

    const loadProject = async () => {
      if (!projectId) {
        loadProjects();
        return;
      }

      try {
        const { data, error } = await supabase
          .from("projects")
          .select("title, html_code")
          .eq("id", projectId)
          .single();

        if (error) throw error;
        if (data) {
          setProjectName(data.title);
          
          // Prepare files for deployment as object
          const filesObject: Record<string, string> = {
            'index.html': data.html_code || '',
            'package.json': JSON.stringify({
              name: data.title.toLowerCase().replace(/[^a-z0-9]/g, '-'),
              version: '1.0.0',
              scripts: {
                dev: 'vite',
                build: 'vite build',
                preview: 'vite preview'
              },
              dependencies: {
                react: '^18.3.1',
                'react-dom': '^18.3.1'
              },
              devDependencies: {
                '@vitejs/plugin-react': '^4.3.1',
                vite: '^5.4.2'
              }
            }, null, 2),
            'vite.config.js': `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})`
          };
          setProjectFiles(filesObject);
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

  // Show project selector if no projectId
  if (!projectId) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-3xl">
              <Rocket className="h-8 w-8" />
              Select Project to Deploy
            </CardTitle>
            <CardDescription className="text-lg">
              Choose a project from your collection to deploy to Vercel
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <p>Loading projects...</p>
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-12">
                <FolderOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground mb-4">No projects found</p>
                <Button onClick={() => navigate("/")}>
                  Create Your First Project
                </Button>
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projects.map((project) => (
                    <Card
                      key={project.id}
                      className="p-4 hover:border-primary/50 transition-all cursor-pointer"
                      onClick={() => navigate(`/deploy/${project.id}`)}
                    >
                      <div className="space-y-3">
                        <h3 className="font-semibold line-clamp-2">{project.title}</h3>
                        <p className="text-xs text-muted-foreground">
                          Created {new Date(project.created_at).toLocaleDateString()}
                        </p>
                        <Button className="w-full" size="sm">
                          <Rocket className="h-4 w-4 mr-2" />
                          Deploy This Project
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

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
            Complete JS/TS/React deployment pipeline with automated build, test, and monitoring
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Complete Pipeline Features:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Pre-flight validation checks</li>
                <li>Dependency analysis</li>
                <li>Automated build process</li>
                <li>Test execution</li>
                <li>One-click deployment to Vercel</li>
                <li>Post-deployment health monitoring</li>
                <li>Real-time stage tracking</li>
                <li>Automatic rollback on failures</li>
              </ul>
            </div>

            <CompletePipelineDashboard 
              projectId={projectId} 
              projectName={projectName}
              projectFiles={projectFiles}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Deploy;