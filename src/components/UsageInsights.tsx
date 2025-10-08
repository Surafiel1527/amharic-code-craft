import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Sparkles, Tag, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/contexts/LanguageContext";

interface Template {
  id: string;
  title: string;
  category: string;
  usage_count: number;
  tags: string[];
}

export const UsageInsights = () => {
  const { t } = useLanguage();
  const [popularTemplates, setPopularTemplates] = useState<Template[]>([]);
  const [trendingTags, setTrendingTags] = useState<{ tag: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  // Translation mapping for template titles
  const translateTemplateTitle = (title: string): string => {
    const titleMap: Record<string, string> = {
      'የግለሰብ ደብዳቤ ገጽ': t('templates.personalLetterPage'),
      'የግል ብሎግ': t('templates.personalBlog'),
      'የፕሮቴይለር ደብዳቤ ገጽ': t('templates.professionalLetterPage'),
      'ንግድ ወቅታዊ': t('templates.businessDashboard'),
      'ፖርትፎሊዮ': t('templates.portfolio'),
      'የቡና ቤት ድህረ ገፅ': t('templates.coffeeShopPage'),
      'የፖርትፎሊዮ ድህረ ገፅ': t('templates.portfolioPage'),
      'Personal Blog': t('templates.personalBlog'),
    };
    return titleMap[title] || title;
  };

  // Translation mapping for categories
  const translateCategory = (category: string): string => {
    const categoryMap: Record<string, string> = {
      'ገጽ': t('templates.categoryPage'),
      'ብሎግ': t('templates.categoryBlog'),
      'ንግድ': t('templates.categoryBusiness'),
      'ፖርትፎሊዮ': t('templates.categoryPortfolio'),
      'Business': t('templates.categoryBusiness'),
      'Blog': t('templates.categoryBlog'),
      'Portfolio': t('templates.categoryPortfolio'),
    };
    return categoryMap[category] || category;
  };

  // Translation mapping for tags
  const translateTag = (tag: string): string => {
    const tagMap: Record<string, string> = {
      'ቡና': t('tags.coffee'),
      'ንግድ': t('tags.business'),
      'ምግብ': t('tags.food'),
      'ብሎግ': t('tags.blog'),
      'የግል': t('tags.personal'),
      'ፖርትፎሊዮ': t('tags.portfolio'),
      'ስነ-ጥበብ': t('tags.art'),
    };
    return tagMap[tag] || tag;
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    try {
      // Fetch popular templates
      const { data: templates } = await supabase
        .from("templates")
        .select("id, title, category, usage_count, tags")
        .order("usage_count", { ascending: false })
        .limit(5);

      setPopularTemplates(templates || []);

      // Aggregate trending tags from projects
      const { data: projects } = await supabase
        .from("projects")
        .select("tags")
        .not("tags", "is", null);

      const tagCounts: Record<string, number> = {};
      projects?.forEach(project => {
        project.tags?.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      });

      const sortedTags = Object.entries(tagCounts)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setTrendingTags(sortedTags);
    } catch (error) {
      console.error("Error fetching insights:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-pulse">{t("insights.loading")}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Popular Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            {t("insights.popularTemplates")}
          </CardTitle>
          <CardDescription>{t("insights.mostUsedTemplates")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {popularTemplates.map((template, index) => (
                <div
                  key={template.id}
                  className="flex items-start gap-3 p-4 bg-muted rounded-lg"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">{translateTemplateTitle(template.title)}</h4>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <Badge variant="outline">{translateCategory(template.category)}</Badge>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {template.usage_count} {t("insights.times")}
                      </span>
                    </div>
                    {template.tags && template.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {template.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {translateTag(tag)}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Trending Tags */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            {t("insights.trendingTags")}
          </CardTitle>
          <CardDescription>{t("insights.mostUsedTags")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {trendingTags.map((item, index) => (
              <div
                key={item.tag}
                className="flex items-center justify-between p-3 bg-muted rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-muted-foreground">
                    #{index + 1}
                  </span>
                  <Badge variant="default" className="font-semibold">
                    {item.tag}
                  </Badge>
                </div>
                <span className="text-sm text-muted-foreground">
                  {item.count} {t("insights.projects")}
                </span>
              </div>
            ))}
          </div>

          {/* Platform Stats */}
          <div className="mt-6 pt-6 border-t">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              {t("insights.platformStats")}
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">
                  {popularTemplates.reduce((sum, t) => sum + (t.usage_count || 0), 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("insights.totalTemplateUsage")}
                </p>
              </div>
              <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">
                  {trendingTags.reduce((sum, t) => sum + t.count, 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("insights.totalTags")}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
