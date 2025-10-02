import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Eye, Heart, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface FeaturedProject {
  id: string;
  project_id: string;
  featured_at: string;
  display_order: number;
  projects: {
    id: string;
    title: string;
    prompt: string;
    tags: string[];
    views_count: number;
    is_favorite: boolean;
    user_id: string;
    profiles: {
      full_name: string | null;
      email: string | null;
    } | null;
  };
}

export const FeaturedGallery = () => {
  const [featuredProjects, setFeaturedProjects] = useState<FeaturedProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchFeaturedProjects();
  }, []);

  const fetchFeaturedProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('featured_projects')
        .select(`
          *,
          projects!inner (
            id,
            title,
            prompt,
            tags,
            views_count,
            is_favorite,
            user_id
          )
        `)
        .order('display_order', { ascending: true })
        .limit(6);

      if (error) throw error;

      // Fetch profiles separately
      const projectsWithProfiles = await Promise.all(
        (data || []).map(async (featured) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', featured.projects.user_id)
            .single();

          return {
            ...featured,
            projects: {
              ...featured.projects,
              profiles: profile
            }
          };
        })
      );

      setFeaturedProjects(projectsWithProfiles);

    } catch (error) {
      console.error('Error fetching featured projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-6">
              <div className="h-48 bg-muted rounded-lg mb-4" />
              <div className="h-4 bg-muted rounded mb-2" />
              <div className="h-3 bg-muted rounded w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (featuredProjects.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center py-12">
          <Star className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">ገና ምንም የተለይ ፕሮጀክት የለም</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Star className="h-6 w-6 text-yellow-500 fill-yellow-500" />
          የተለዩ ፕሮጀክቶች
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {featuredProjects.map((featured) => (
          <Card
            key={featured.id}
            className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
            onClick={() => navigate(`/shared/${featured.projects.id}`)}
          >
            <div className="relative">
              <div className="absolute top-2 right-2 z-10">
                <Badge className="bg-yellow-500 hover:bg-yellow-600">
                  <Star className="h-3 w-3 mr-1 fill-white" />
                  የተለየ
                </Badge>
              </div>
              <div className="h-48 bg-gradient-to-br from-primary/20 via-accent/20 to-secondary/20 flex items-center justify-center">
                <div className="text-6xl opacity-20">🌟</div>
              </div>
            </div>

            <CardContent className="pt-4">
              <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                {featured.projects.title}
              </h3>
              
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {featured.projects.prompt}
              </p>

              {featured.projects.tags && featured.projects.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {featured.projects.tags.slice(0, 3).map((tag, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {featured.projects.views_count || 0}
                  </span>
                </div>
                <span>
                  ያቀረበው: {featured.projects.profiles?.full_name || 'Anonymous User'}
                </span>
              </div>

              <Button
                className="w-full mt-4"
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/shared/${featured.projects.id}`);
                }}
              >
                <ExternalLink className="h-3 w-3 mr-2" />
                ይመልከቱ
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
