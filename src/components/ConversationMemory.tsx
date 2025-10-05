import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Brain, Trash2, Sparkles, TrendingUp } from "lucide-react";
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

export function ConversationMemory({ conversationId, userId }: ConversationMemoryProps) {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPatterns: 0,
    avgConfidence: 0,
    topCategory: ''
  });

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

        setStats({
          totalPatterns: combined.length,
          avgConfidence: avgConf,
          topCategory: topCat
        });
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
          <h3 className="font-semibold">Conversation Memory</h3>
        </div>
        <Badge variant="secondary">
          <Sparkles className="w-3 h-3 mr-1" />
          AI Learning
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-2 bg-muted rounded">
          <div className="text-2xl font-bold">{stats.totalPatterns}</div>
          <div className="text-[10px] text-muted-foreground">Patterns</div>
        </div>
        <div className="text-center p-2 bg-muted rounded">
          <div className="text-2xl font-bold">{stats.avgConfidence.toFixed(0)}%</div>
          <div className="text-[10px] text-muted-foreground">Confidence</div>
        </div>
        <div className="text-center p-2 bg-muted rounded">
          <div className="text-sm font-bold truncate">{stats.topCategory || 'N/A'}</div>
          <div className="text-[10px] text-muted-foreground">Top Category</div>
        </div>
      </div>

      {/* Memory List */}
      <ScrollArea className="h-[300px]">
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

      <div className="pt-2 border-t text-xs text-muted-foreground">
        <p>💡 The AI learns from your coding patterns and reuses successful approaches</p>
      </div>
    </Card>
  );
}
