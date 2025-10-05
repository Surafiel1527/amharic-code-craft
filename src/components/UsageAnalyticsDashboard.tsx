import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, TrendingUp, Users, Activity, Clock, Zap } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface AnalyticsData {
  totalEvents: number;
  uniqueUsers: number;
  popularFeatures: { feature: string; count: number }[];
  recentActivity: { event: string; timestamp: string }[];
  peakHours: { hour: number; count: number }[];
}

export const UsageAnalyticsDashboard = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalEvents: 0,
    uniqueUsers: 0,
    popularFeatures: [],
    recentActivity: [],
    peakHours: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Total events
      const { count: totalEvents } = await (supabase as any)
        .from("usage_analytics")
        .select("*", { count: "exact", head: true });

      // Unique users
      const { data: usersData } = await (supabase as any)
        .from("usage_analytics")
        .select("user_id");

      const uniqueUsers = new Set(usersData?.map((d: any) => d.user_id)).size;

      // Popular features
      const { data: featuresData } = await (supabase as any)
        .from("usage_analytics")
        .select("event_type")
        .limit(1000);

      const featureCounts: Record<string, number> = {};
      featuresData?.forEach((item: any) => {
        featureCounts[item.event_type] = (featureCounts[item.event_type] || 0) + 1;
      });

      const popularFeatures = Object.entries(featureCounts)
        .map(([feature, count]) => ({ feature, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Recent activity
      const { data: recentData } = await (supabase as any)
        .from("usage_analytics")
        .select("event_type, created_at")
        .order("created_at", { ascending: false })
        .limit(10);

      const recentActivity =
        recentData?.map((item: any) => ({
          event: item.event_type,
          timestamp: item.created_at,
        })) || [];

      // Peak hours (simplified)
      const { data: hoursData } = await (supabase as any)
        .from("usage_analytics")
        .select("created_at")
        .limit(1000);

      const hourCounts: Record<number, number> = {};
      hoursData?.forEach((item: any) => {
        const hour = new Date(item.created_at).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });

      const peakHours = Object.entries(hourCounts)
        .map(([hour, count]) => ({ hour: parseInt(hour), count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setAnalytics({
        totalEvents: totalEvents || 0,
        uniqueUsers,
        popularFeatures,
        recentActivity,
        peakHours,
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
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
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalEvents.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.uniqueUsers}</div>
            <p className="text-xs text-muted-foreground">Active users tracked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peak Activity</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.peakHours[0]?.hour || 0}:00
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.peakHours[0]?.count || 0} events
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Popular Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5" />
            Most Used Features
          </CardTitle>
          <CardDescription>Top 5 features by usage count</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.popularFeatures.map((feature, index) => (
              <div key={feature.feature} className="flex items-center gap-4">
                <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">
                  {index + 1}
                </Badge>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{feature.feature}</span>
                    <span className="text-sm text-muted-foreground">
                      {feature.count} uses
                    </span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{
                        width: `${(feature.count / analytics.popularFeatures[0].count) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>Last 10 events across all users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {analytics.recentActivity.map((activity, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-muted rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="font-medium">{activity.event}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {new Date(activity.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Peak Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Peak Usage Hours
          </CardTitle>
          <CardDescription>Top 5 most active hours of the day</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4">
            {analytics.peakHours.map((hour) => (
              <Card key={hour.hour} className="text-center p-4">
                <div className="text-2xl font-bold">{hour.hour}:00</div>
                <div className="text-sm text-muted-foreground">{hour.count} events</div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
