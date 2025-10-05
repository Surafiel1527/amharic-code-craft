import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Brain, Trash2, Sparkles, TrendingUp, Download, 
  Upload, LineChart, Award, Target, Zap 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MemoryItem {
  id: string;
  pattern: string;
  category: string;
  confidence: number;
  usageCount: number;
  lastUsed: string;
}

interface ConversationMemoryProps {
  conversationId: string;
  userId: string;
}

interface PatternTrend {
  date: string;
  patterns: number;
  avgConfidence: number;
}

interface Recommendation {
  id: string;
  title: string;
  description: string;
  patternId?: string;
  confidence: number;
  impact: string;
}

export function ConversationMemory({ conversationId, userId }: ConversationMemoryProps) {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPatterns: 0,
    avgConfidence: 0,
    topCategory: '',
    learningEffectiveness: 0,
    patternGrowth: 0
  });
  const [trends, setTrends] = useState<PatternTrend[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  useEffect(() => {
    loadMemories();
  }, [conversationId]);

  const loadMemories = async () => {
    try {
      // Load conversation-specific learnings
      const { data: convLearnings, error: convError } = await supabase
        .from('conversation_learnings')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('confidence', { ascending: false })
        .limit(10);

      if (convError) throw convError;

      // Load cross-project patterns for this user
      const { data: crossPatterns, error: crossError } = await supabase
        .from('cross_project_patterns')
        .select('*')
        .eq('user_id', userId)
        .order('usage_count', { ascending: false })
        .limit(5);

      if (crossError) throw crossError;

      // Combine and format
      const combined = [
        ...(convLearnings || []).map(l => ({
          id: l.id,
          pattern: l.learned_pattern,
          category: l.pattern_category,
          confidence: l.confidence,
          usageCount: l.times_reinforced,
          lastUsed: l.last_reinforced_at
        })),
        ...(crossPatterns || []).map(p => ({
          id: p.id,
          pattern: p.pattern_name,
          category: p.pattern_type,
          confidence: p.confidence_score,
          usageCount: p.usage_count,
          lastUsed: p.last_used_at
        }))
      ];

      setMemories(combined);

      // Calculate stats
      if (combined.length > 0) {
        const avgConf = combined.reduce((sum, m) => sum + m.confidence, 0) / combined.length;
        const categories = combined.map(m => m.category);
        const topCat = categories.sort((a, b) =>
          categories.filter(c => c === b).length - categories.filter(c => c === a).length
        )[0];

        // Calculate learning effectiveness (patterns with high confidence and usage)
        const effectivePatterns = combined.filter(p => p.confidence > 70 && p.usageCount > 2);
        const effectiveness = (effectivePatterns.length / combined.length) * 100;

        // Calculate pattern growth (compare last 7 days vs previous 7 days)
        const now = new Date();
        const last7Days = combined.filter(p => {
          const pDate = new Date(p.lastUsed);
          const diffDays = (now.getTime() - pDate.getTime()) / (1000 * 60 * 60 * 24);
          return diffDays <= 7;
        }).length;
        
        const prev7Days = combined.filter(p => {
          const pDate = new Date(p.lastUsed);
          const diffDays = (now.getTime() - pDate.getTime()) / (1000 * 60 * 60 * 24);
          return diffDays > 7 && diffDays <= 14;
        }).length;
        
        const growth = prev7Days > 0 ? ((last7Days - prev7Days) / prev7Days) * 100 : 0;

        setStats({
          totalPatterns: combined.length,
          avgConfidence: avgConf,
          topCategory: topCat,
          learningEffectiveness: effectiveness,
          patternGrowth: growth
        });

        // Generate trends (last 7 days)
        const trendData: PatternTrend[] = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (6 - i));
          const dateStr = date.toISOString().split('T')[0];
          
          const dayPatterns = combined.filter(p => p.lastUsed.startsWith(dateStr));
          const avgConf = dayPatterns.length > 0
            ? dayPatterns.reduce((sum, p) => sum + p.confidence, 0) / dayPatterns.length
            : 0;
          
          return {
            date: dateStr,
            patterns: dayPatterns.length,
            avgConfidence: avgConf
          };
        });
        setTrends(trendData);

        // Generate recommendations
        const recs: Recommendation[] = [];
        
        // Low confidence patterns
        const lowConfidence = combined.filter(p => p.confidence < 50);
        if (lowConfidence.length > 0) {
          recs.push({
            id: 'low-conf',
            title: 'Improve Low Confidence Patterns',
            description: `${lowConfidence.length} patterns have confidence below 50%. Review and reinforce them.`,
            confidence: 80,
            impact: 'High'
          });
        }

        // Unused patterns
        const unused = combined.filter(p => p.usageCount < 2);
        if (unused.length > 3) {
          recs.push({
            id: 'unused',
            title: 'Activate Dormant Patterns',
            description: `${unused.length} patterns are rarely used. Consider applying them to new projects.`,
            confidence: 70,
            impact: 'Medium'
          });
        }

        // Category dominance
        const categoryDominance = (categories.filter(c => c === topCat).length / categories.length) * 100;
        if (categoryDominance > 60) {
          recs.push({
            id: 'diversity',
            title: 'Diversify Pattern Categories',
            description: `${categoryDominance.toFixed(0)}% of patterns are in "${topCat}". Explore other categories.`,
            confidence: 65,
            impact: 'Low'
          });
        }

        setRecommendations(recs);
      }
    } catch (error) {
      console.error('Failed to load memories:', error);
      toast.error('Failed to load conversation memory');
    } finally {
      setLoading(false);
    }
  };

  const deleteMemory = async (id: string) => {
    try {
      // Try to delete from both tables
      await supabase.from('conversation_learnings').delete().eq('id', id);
      await supabase.from('cross_project_patterns').delete().eq('id', id);
      
      setMemories(memories.filter(m => m.id !== id));
      toast.success('Memory deleted');
    } catch (error) {
      console.error('Failed to delete memory:', error);
      toast.error('Failed to delete memory');
    }
  };

  const exportPatterns = async () => {
    try {
      const exportData = {
        version: '1.0',
        exported: new Date().toISOString(),
        userId,
        conversationId,
        patterns: memories,
        stats
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `patterns-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success('Patterns exported successfully');
    } catch (error) {
      toast.error('Failed to export patterns');
    }
  };

  const importPatterns = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.patterns || !Array.isArray(data.patterns)) {
        throw new Error('Invalid pattern file');
      }

      // Import patterns to conversation_learnings
      for (const pattern of data.patterns) {
        await supabase.from('conversation_learnings').insert({
          user_id: userId,
          conversation_id: conversationId,
          learned_pattern: pattern.pattern,
          pattern_category: pattern.category,
          confidence: pattern.confidence,
          times_reinforced: 1
        });
      }

      await loadMemories();
      toast.success(`Imported ${data.patterns.length} patterns`);
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import patterns');
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'component': 'bg-blue-500',
      'styling': 'bg-purple-500',
      'logic': 'bg-green-500',
      'api': 'bg-orange-500',
      'optimization': 'bg-red-500',
      'pattern': 'bg-pink-500'
    };
    return colors[category] || 'bg-gray-500';
  };

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Brain className="w-4 h-4 animate-pulse" />
          Loading conversation memory...
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5" />
          <h3 className="font-semibold">Advanced Memory System</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportPatterns}>
            <Download className="w-3 h-3 mr-1" />
            Export
          </Button>
          <Button variant="outline" size="sm" asChild>
            <label>
              <Upload className="w-3 h-3 mr-1" />
              Import
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={importPatterns}
              />
            </label>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
          <TabsTrigger value="recommendations">Tips</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-3">
          {/* Enhanced Stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="text-center p-3 bg-blue-500/10 rounded">
              <div className="text-2xl font-bold text-blue-600">{stats.totalPatterns}</div>
              <div className="text-[10px] text-muted-foreground">Total Patterns</div>
            </div>
            <div className="text-center p-3 bg-green-500/10 rounded">
              <div className="text-2xl font-bold text-green-600">{stats.avgConfidence.toFixed(0)}%</div>
              <div className="text-[10px] text-muted-foreground">Avg Confidence</div>
            </div>
            <div className="text-center p-3 bg-purple-500/10 rounded">
              <div className="text-2xl font-bold text-purple-600">{stats.learningEffectiveness.toFixed(0)}%</div>
              <div className="text-[10px] text-muted-foreground">Effectiveness</div>
            </div>
            <div className="text-center p-3 bg-orange-500/10 rounded">
              <div className="text-2xl font-bold text-orange-600">
                {stats.patternGrowth > 0 ? '+' : ''}{stats.patternGrowth.toFixed(0)}%
              </div>
              <div className="text-[10px] text-muted-foreground">7-Day Growth</div>
            </div>
          </div>

          {/* Top Category */}
          <Card className="p-3 bg-muted/50">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Top Category</div>
                <div className="text-lg font-bold capitalize">{stats.topCategory || 'N/A'}</div>
              </div>
              <Award className="w-8 h-8 text-primary" />
            </div>
          </Card>

          {/* Quick Insights */}
          <Card className="p-3">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Quick Insights
            </h4>
            <div className="space-y-1 text-xs">
              {stats.learningEffectiveness > 70 && (
                <p className="text-green-600">✓ High learning effectiveness detected</p>
              )}
              {stats.patternGrowth > 10 && (
                <p className="text-blue-600">✓ Strong pattern growth this week</p>
              )}
              {stats.avgConfidence > 80 && (
                <p className="text-purple-600">✓ Excellent pattern confidence scores</p>
              )}
              {stats.totalPatterns > 20 && (
                <p className="text-orange-600">✓ Building comprehensive pattern library</p>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <LineChart className="w-4 h-4" />
            7-Day Pattern Trends
          </h4>
          <ScrollArea className="h-[300px]">
            <div className="space-y-3">
              {trends.map((trend, idx) => (
                <Card key={idx} className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      {new Date(trend.date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </span>
                    <Badge variant="outline">{trend.patterns} patterns</Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Activity</span>
                      <span className="font-medium">{trend.patterns}</span>
                    </div>
                    <Progress value={(trend.patterns / stats.totalPatterns) * 100} className="h-1.5" />
                  </div>
                  {trend.avgConfidence > 0 && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Avg confidence: {trend.avgConfidence.toFixed(0)}%
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="patterns">
          <ScrollArea className="h-[350px]">
        <div className="space-y-2">
          {memories.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No patterns learned yet. Keep coding to build memory!
            </div>
          ) : (
            memories.map(memory => (
              <Card key={memory.id} className="p-3 hover:bg-accent transition-colors group">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge 
                          className={`text-[10px] ${getCategoryColor(memory.category)} text-white`}
                        >
                          {memory.category}
                        </Badge>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <TrendingUp className="w-3 h-3" />
                          {memory.usageCount}x
                        </div>
                      </div>
                      <p className="text-sm font-medium truncate">{memory.pattern}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => deleteMemory(memory.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Confidence:</span>
                      <div className="flex items-center gap-1">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary"
                            style={{ width: `${memory.confidence}%` }}
                          />
                        </div>
                        <span className="font-medium">{memory.confidence}%</span>
                      </div>
                    </div>
                    <span className="text-muted-foreground">
                      {new Date(memory.lastUsed).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Target className="w-4 h-4" />
            AI Recommendations
          </h4>
          {recommendations.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <Target className="w-12 h-12 mx-auto mb-2 opacity-50" />
              Your patterns are well optimized!
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {recommendations.map((rec) => (
                  <Card key={rec.id} className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h5 className="text-sm font-medium">{rec.title}</h5>
                        <p className="text-xs text-muted-foreground mt-1">{rec.description}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {rec.confidence}% confident
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Impact:</span>
                      <Badge 
                        variant={rec.impact === 'High' ? 'default' : 'secondary'}
                        className="text-[10px]"
                      >
                        {rec.impact}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>

      <div className="pt-2 border-t text-xs text-muted-foreground">
        <p>💡 Advanced memory system tracks patterns, trends, and provides intelligent recommendations</p>
      </div>
    </Card>
  );
}
