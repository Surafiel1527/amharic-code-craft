import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Activity, Target } from "lucide-react";

export const AIMetricsChart = () => {
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [modelData, setModelData] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      // Get data for last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data: analytics } = await supabase
        .from('generation_analytics')
        .select('*')
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: true });

      if (analytics) {
        // Process daily metrics
        const dailyMetrics = processDailyMetrics(analytics);
        setDailyData(dailyMetrics);

        // Process model performance
        const modelMetrics = processModelMetrics(analytics);
        setModelData(modelMetrics);

        // Process status distribution
        const statusMetrics = processStatusMetrics(analytics);
        setStatusData(statusMetrics);
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const processDailyMetrics = (data: any[]) => {
    const grouped: { [key: string]: any } = {};

    data.forEach(item => {
      const date = new Date(item.created_at).toISOString().split('T')[0];
      if (!grouped[date]) {
        grouped[date] = {
          date,
          total: 0,
          success: 0,
          avgTime: 0,
          timeSum: 0,
          avgSatisfaction: 0,
          satisfactionSum: 0,
          satisfactionCount: 0
        };
      }

      grouped[date].total++;
      if (item.status === 'success') grouped[date].success++;
      if (item.generation_time_ms) {
        grouped[date].timeSum += item.generation_time_ms;
      }
      if (item.user_satisfaction_score) {
        grouped[date].satisfactionSum += item.user_satisfaction_score;
        grouped[date].satisfactionCount++;
      }
    });

    return Object.values(grouped).map(day => ({
      date: day.date,
      successRate: ((day.success / day.total) * 100).toFixed(1),
      avgTime: day.total > 0 ? (day.timeSum / day.total).toFixed(0) : 0,
      satisfaction: day.satisfactionCount > 0 ? (day.satisfactionSum / day.satisfactionCount).toFixed(1) : 0,
      total: day.total
    }));
  };

  const processModelMetrics = (data: any[]) => {
    const grouped: { [key: string]: any } = {};

    data.forEach(item => {
      const model = item.model_used || 'unknown';
      if (!grouped[model]) {
        grouped[model] = {
          model,
          total: 0,
          success: 0,
          avgTime: 0,
          timeSum: 0
        };
      }

      grouped[model].total++;
      if (item.status === 'success') grouped[model].success++;
      if (item.generation_time_ms) {
        grouped[model].timeSum += item.generation_time_ms;
      }
    });

    return Object.values(grouped).map(model => ({
      model: model.model.replace('google/', '').replace('openai/', ''),
      successRate: ((model.success / model.total) * 100).toFixed(1),
      avgTime: (model.timeSum / model.total).toFixed(0),
      total: model.total
    }));
  };

  const processStatusMetrics = (data: any[]) => {
    const grouped: { [key: string]: number } = {};

    data.forEach(item => {
      const status = item.status || 'unknown';
      grouped[status] = (grouped[status] || 0) + 1;
    });

    return Object.entries(grouped).map(([status, count]) => ({
      status,
      count
    }));
  };

  const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1'];

  if (loading) {
    return <div className="p-4">Loading metrics...</div>;
  }

  return (
    <Tabs defaultValue="trends" className="space-y-4">
      <TabsList>
        <TabsTrigger value="trends" className="gap-2">
          <TrendingUp className="h-4 w-4" />
          Trends
        </TabsTrigger>
        <TabsTrigger value="models" className="gap-2">
          <Activity className="h-4 w-4" />
          Model Performance
        </TabsTrigger>
        <TabsTrigger value="status" className="gap-2">
          <Target className="h-4 w-4" />
          Status Distribution
        </TabsTrigger>
      </TabsList>

      <TabsContent value="trends" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Success Rate Over Time</CardTitle>
            <CardDescription>Daily success rate for AI generations</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="successRate" stroke="#10b981" name="Success Rate %" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Generation Speed</CardTitle>
            <CardDescription>Average generation time in milliseconds</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="avgTime" stroke="#f59e0b" name="Avg Time (ms)" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="models">
        <Card>
          <CardHeader>
            <CardTitle>Model Performance Comparison</CardTitle>
            <CardDescription>Success rates across different AI models</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={modelData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="model" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="successRate" fill="#10b981" name="Success Rate %" />
                <Bar dataKey="avgTime" fill="#f59e0b" name="Avg Time (ms)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="status">
        <Card>
          <CardHeader>
            <CardTitle>Generation Status Distribution</CardTitle>
            <CardDescription>Breakdown of generation outcomes</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ status, percent }) => `${status}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};