import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, GitFork, Eye } from "lucide-react";
import { toast } from "sonner";

interface SharedProject {
  id: string;
  title: string;
  prompt: string;
  html_code: string;
  created_at: string;
  views_count: number;
  tags: string[];
}

export default function SharedProject() {
  const { shareToken } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<SharedProject | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (shareToken) {
      fetchSharedProject();
    }
  }, [shareToken]);

  const fetchSharedProject = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('share_token', shareToken)
        .eq('is_public', true)
        .single();

      if (error) throw error;

      if (data) {
        setProject(data);
        // Increment view count
        await supabase
          .from('projects')
          .update({ views_count: (data.views_count || 0) + 1 })
          .eq('id', data.id);
      }
    } catch (error) {
      console.error('Error fetching shared project:', error);
      toast.error("ፕሮጀክት ማግኘት አልተቻለም");
    } finally {
      setLoading(false);
    }
  };

  const handleFork = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("እባክዎ ለመውረስ ይግቡ");
        navigate('/auth');
        return;
      }

      if (!project) return;

      const { error } = await supabase.from('projects').insert({
        title: `${project.title} (የተወረሰ)`,
        prompt: project.prompt,
        html_code: project.html_code,
        user_id: user.id,
        forked_from: project.id,
        tags: project.tags
      });

      if (error) throw error;
      toast.success("ፕሮጀክት በተሳካ ሁኔታ ተወርሷል!");
      navigate('/');
    } catch (error) {
      console.error('Error forking project:', error);
      toast.error("ፕሮጀክት መውረስ አልተቻለም");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-8 flex items-center justify-center">
        <Card className="p-12 text-center">
          <h1 className="text-2xl font-bold mb-4">ፕሮጀክት አልተገኘም</h1>
          <p className="text-muted-foreground mb-6">
            ይህ ፕሮጀክት የለም ወይም ይፋዊ አይደለም።
          </p>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            ወደ ቤት ተመለስ
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                {project.title}
              </h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  {project.views_count} እይታዎች
                </span>
                <span>
                  {new Date(project.created_at).toLocaleDateString('am-ET')}
                </span>
              </div>
            </div>
          </div>

          <Button onClick={handleFork} className="gap-2">
            <GitFork className="h-4 w-4" />
            ይህን ፕሮጀክት ውረስ
          </Button>
        </div>

        {/* Preview */}
        <Card className="p-6 space-y-4">
          <div className="bg-background rounded-lg border border-border overflow-hidden">
            <iframe
              srcDoc={project.html_code}
              title="Project Preview"
              className="w-full h-[600px] border-0"
              sandbox="allow-scripts allow-forms allow-popups allow-modals"
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
