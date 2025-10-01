import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Eye, Copy, Users, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ProjectAnalyticsProps {
  projectId: string;
}

interface AnalyticsData {
  views: number;
  forks: number;
  favorites: number;
  comments: number;
  ratings: { average: number; count: number };
  viewsOverTime: { date: string; views: number }[];
}

export const ProjectAnalytics = ({ projectId }: ProjectAnalyticsProps) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [projectId]);

  const fetchAnalytics = async () => {
    try {
      // Fetch project data
      const { data: project } = await supabase
        .from("projects")
        .select("views_count, is_favorite")
        .eq("id", projectId)
        .single();

      // Count forks
      const { count: forksCount } = await supabase
        .from("projects")
        .select("*", { count: "exact", head: true })
        .eq("forked_from", projectId);

      // Count comments
      const { count: commentsCount } = await supabase
        .from("project_comments")
        .select("*", { count: "exact", head: true })
        .eq("project_id", projectId);

      // Get ratings
      const { data: ratings } = await supabase
        .from("project_ratings")
        .select("rating")
        .eq("project_id", projectId);

      const avgRating = ratings && ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
        : 0;

      // Mock views over time (in real app, you'd track this)
      const viewsOverTime = Array.from({ length: 7 }, (_, i) => ({
        date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('am-ET', { month: 'short', day: 'numeric' }),
        views: Math.floor(Math.random() * 50) + 10
      }));

      setAnalytics({
        views: project?.views_count || 0,
        forks: forksCount || 0,
        favorites: project?.is_favorite ? 1 : 0,
        comments: commentsCount || 0,
        ratings: {
          average: avgRating,
          count: ratings?.length || 0
        },
        viewsOverTime
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-pulse">መረጃ እየተጫነ ነው...</div>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) {
    return null;
  }

  const statsCards = [
    { label: "ጠቅላላ እይታዎች", value: analytics.views, icon: Eye, color: "text-blue-600" },
    { label: "ቅጂዎች/ፎርኮች", value: analytics.forks, icon: Copy, color: "text-green-600" },
    { label: "አስተያየቶች", value: analytics.comments, icon: Users, color: "text-purple-600" },
    { label: "አማካይ ደረጃ", value: analytics.ratings.average.toFixed(1), icon: TrendingUp, color: "text-yellow-600" },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                <stat.icon className={`w-8 h-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Views Over Time */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            የእይታ አዝማሚያ
          </CardTitle>
          <CardDescription>ባለፉት 7 ቀናት</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.viewsOverTime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="views" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Engagement Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>የተሳትፎ መለኪያዎች</CardTitle>
          <CardDescription>የተጠቃሚ ተሳትፎ ስርጭት</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={[
              { name: 'እይታዎች', value: analytics.views },
              { name: 'ቅጂዎች', value: analytics.forks * 10 },
              { name: 'አስተያየቶች', value: analytics.comments * 5 },
              { name: 'ደረጃዎች', value: analytics.ratings.count * 8 }
            ]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
