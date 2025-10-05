import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Brain, TrendingUp, CheckCircle2, XCircle, 
  AlertTriangle, Code, Database, Zap, Layout,
  Activity, Clock, Target, BookOpen
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ErrorPattern {
  id: string;
  error_category: string;
  error_subcategory: string;
  error_pattern: string;
  diagnosis: any;
  root_cause: string;
  solution: any;
  fix_type: string;
  success_count: number;
  failure_count: number;
  confidence_score: number;
  times_encountered: number;
  learned_at: string;
  last_success_at: string;
  affected_technologies: any;
  prevention_tips: any;
}

const CATEGORY_ICONS: Record<string, any> = {
  deployment: Zap,
  runtime: AlertTriangle,
  typescript: Code,
  api: Activity,
  database: Database,
  build: Target,
  ui: Layout,
  performance: TrendingUp
};

const CATEGORY_COLORS: Record<string, string> = {
  deployment: "bg-purple-500",
  runtime: "bg-red-500",
  typescript: "bg-blue-500",
  api: "bg-green-500",
  database: "bg-yellow-500",
  build: "bg-orange-500",
  ui: "bg-pink-500",
  performance: "bg-cyan-500"
};

export function UniversalErrorLearningDashboard() {
  const [patterns, setPatterns] = useState<ErrorPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalPatterns: 0,
    totalFixes: 0,
    avgConfidence: 0,
    successRate: 0
  });

  useEffect(() => {
    loadPatterns();
  }, [selectedCategory]);

  const loadPatterns = async () => {
    try {
      let query = supabase
        .from('universal_error_patterns')
        .select('*')
        .order('confidence_score', { ascending: false });
      
      if (selectedCategory) {
        query = query.eq('error_category', selectedCategory);
      }
      
      const { data, error } = await query.limit(50);
      
      if (error) throw error;
      
      setPatterns(data || []);
      
      // Calculate stats
      if (data && data.length > 0) {
        const totalFixes = data.reduce((sum, p) => sum + p.success_count + p.failure_count, 0);
        const totalSuccess = data.reduce((sum, p) => sum + p.success_count, 0);
        const avgConf = data.reduce((sum, p) => sum + p.confidence_score, 0) / data.length;
        
        setStats({
          totalPatterns: data.length,
          totalFixes,
          avgConfidence: avgConf,
          successRate: totalFixes > 0 ? (totalSuccess / totalFixes) * 100 : 0
        });
      }
    } catch (error) {
      console.error('Failed to load patterns:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = Array.from(new Set(patterns.map(p => p.error_category)));

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Brain className="w-8 h-8 text-primary" />
        <div>
          <h2 className="text-2xl font-bold">AI Error Learning Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            Enterprise-level error pattern recognition and automated fixing
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 bg-gradient-to-br from-primary/10 to-primary/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Learned Patterns</p>
              <p className="text-2xl font-bold">{stats.totalPatterns}</p>
            </div>
            <BookOpen className="w-8 h-8 text-primary opacity-50" />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-green-500/10 to-green-500/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Fixes</p>
              <p className="text-2xl font-bold">{stats.totalFixes}</p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-green-500 opacity-50" />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Avg Confidence</p>
              <p className="text-2xl font-bold">{Math.round(stats.avgConfidence * 100)}%</p>
            </div>
            <Target className="w-8 h-8 text-blue-500 opacity-50" />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-500/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Success Rate</p>
              <p className="text-2xl font-bold">{Math.round(stats.successRate)}%</p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-500 opacity-50" />
          </div>
        </Card>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <Badge
          variant={selectedCategory === null ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => setSelectedCategory(null)}
        >
          All Categories
        </Badge>
        {categories.map(category => {
          const Icon = CATEGORY_ICONS[category] || AlertTriangle;
          return (
            <Badge
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setSelectedCategory(category)}
            >
              <Icon className="w-3 h-3 mr-1" />
              {category}
            </Badge>
          );
        })}
      </div>

      {/* Patterns List */}
      <ScrollArea className="h-[600px]">
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading patterns...</div>
          ) : patterns.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No error patterns learned yet. The AI will start learning as you encounter errors.
            </div>
          ) : (
            patterns.map(pattern => {
              const Icon = CATEGORY_ICONS[pattern.error_category] || AlertTriangle;
              const colorClass = CATEGORY_COLORS[pattern.error_category] || "bg-gray-500";
              const successRate = pattern.success_count + pattern.failure_count > 0
                ? (pattern.success_count / (pattern.success_count + pattern.failure_count)) * 100
                : 0;

              return (
                <Card key={pattern.id} className="p-4 hover:shadow-lg transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${colorClass} bg-opacity-20`}>
                      <Icon className="w-6 h-6" />
                    </div>

                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {pattern.error_category}
                            </Badge>
                            {pattern.error_subcategory && (
                              <Badge variant="secondary" className="text-xs">
                                {pattern.error_subcategory}
                              </Badge>
                            )}
                          </div>
                          <p className="font-medium line-clamp-2 mb-2">
                            {pattern.diagnosis?.diagnosis || pattern.root_cause}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-1 font-mono bg-muted px-2 py-1 rounded">
                            {pattern.error_pattern}
                          </p>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <Badge variant={pattern.confidence_score > 0.7 ? "default" : "secondary"}>
                            {Math.round(pattern.confidence_score * 100)}% confidence
                          </Badge>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {pattern.times_encountered}x seen
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground">Success Rate</span>
                            <span className="text-xs font-medium">{Math.round(successRate)}%</span>
                          </div>
                          <Progress value={successRate} className="h-2" />
                        </div>

                        <div className="flex gap-4 text-xs">
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="w-3 h-3" />
                            {pattern.success_count}
                          </div>
                          <div className="flex items-center gap-1 text-red-600">
                            <XCircle className="w-3 h-3" />
                            {pattern.failure_count}
                          </div>
                        </div>
                      </div>

                      {pattern.affected_technologies && pattern.affected_technologies.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {pattern.affected_technologies.slice(0, 5).map(tech => (
                            <Badge key={tech} variant="outline" className="text-[10px]">
                              {tech}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}