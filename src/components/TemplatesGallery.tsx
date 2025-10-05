import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Search, Download, Star, TrendingUp, Sparkles, Code2 } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnail_url: string | null;
  tags: string[];
  downloads_count: number;
  rating: number;
  ratings_count: number;
  is_featured: boolean;
  is_premium: boolean;
}

export const TemplatesGallery = () => {
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<ProjectTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const categories = [
    { id: "all", label: "All Templates", icon: <Code2 className="h-4 w-4" /> },
    { id: "featured", label: "Featured", icon: <Sparkles className="h-4 w-4" /> },
    { id: "dashboard", label: "Dashboards" },
    { id: "landing", label: "Landing Pages" },
    { id: "ecommerce", label: "E-commerce" },
    { id: "blog", label: "Blogs" },
    { id: "portfolio", label: "Portfolios" },
  ];

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    filterTemplates();
  }, [templates, searchQuery, selectedCategory]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("project_templates")
        .select("*")
        .order("downloads_count", { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  const filterTemplates = () => {
    let filtered = [...templates];

    if (selectedCategory === "featured") {
      filtered = filtered.filter((t) => t.is_featured);
    } else if (selectedCategory !== "all") {
      filtered = filtered.filter((t) => t.category === selectedCategory);
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    setFilteredTemplates(filtered);
  };

  const handleDownload = async (templateId: string) => {
    try {
      // Increment download count - use raw SQL for increment
      const { data: template } = await (supabase as any)
        .from("project_templates")
        .select("downloads_count")
        .eq("id", templateId)
        .single();

      const { error } = await (supabase as any)
        .from("project_templates")
        .update({ downloads_count: (template?.downloads_count || 0) + 1 })
        .eq("id", templateId);

      if (error) throw error;

      toast.success("Template downloaded! Check your projects.");
      fetchTemplates();
    } catch (error) {
      console.error("Error downloading template:", error);
      toast.error("Failed to download template");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Project Templates Gallery</CardTitle>
          <CardDescription>
            Browse and download professional templates to kickstart your projects
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      <Tabs defaultValue="all" onValueChange={setSelectedCategory}>
        <TabsList className="grid w-full grid-cols-7">
          {categories.map((cat) => (
            <TabsTrigger key={cat.id} value={cat.id} className="gap-2">
              {cat.icon}
              <span className="hidden sm:inline">{cat.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-6">
          <ScrollArea className="h-[600px]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.length === 0 ? (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  <Code2 className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>No templates found</p>
                </div>
              ) : (
                filteredTemplates.map((template) => (
                  <Card key={template.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    {/* Template Thumbnail */}
                    <div className="h-48 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      {template.thumbnail_url ? (
                        <img
                          src={template.thumbnail_url}
                          alt={template.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Code2 className="h-16 w-16 text-muted-foreground opacity-50" />
                      )}
                    </div>

                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <div className="flex gap-1">
                          {template.is_featured && (
                            <Badge variant="outline" className="shrink-0">
                              <Sparkles className="h-3 w-3" />
                            </Badge>
                          )}
                          {template.is_premium && (
                            <Badge variant="default" className="shrink-0">
                              PRO
                            </Badge>
                          )}
                        </div>
                      </div>
                      <CardDescription className="line-clamp-2">
                        {template.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Tags */}
                      <div className="flex flex-wrap gap-2">
                        {template.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      {/* Stats */}
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-current text-yellow-500" />
                          <span>{template.rating.toFixed(1)}</span>
                          <span className="text-xs">({template.ratings_count})</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Download className="h-4 w-4" />
                          <span>{template.downloads_count}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <Button
                        className="w-full"
                        onClick={() => handleDownload(template.id)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Use Template
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};
