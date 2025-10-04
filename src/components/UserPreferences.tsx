import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, TrendingUp, Settings, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface UserPreference {
  id: string;
  preference_type: string;
  preference_value: any;
  confidence_score: number;
  learned_from_interactions: number;
}

interface ConversationLearning {
  id: string;
  learned_pattern: string;
  pattern_category: string;
  confidence: number;
  times_reinforced: number;
}

export function UserPreferences() {
  const [preferences, setPreferences] = useState<UserPreference[]>([]);
  const [learnings, setLearnings] = useState<ConversationLearning[]>([]);
  const [loading, setLoading] = useState(false);

  const loadPreferences = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-preferences', {
        body: { action: 'get' }
      });

      if (error) throw error;

      setPreferences(data.preferences || []);
      setLearnings(data.recentLearnings || []);
    } catch (error: any) {
      console.error('Failed to load preferences:', error);
      toast.error('Failed to load preferences');
    } finally {
      setLoading(false);
    }
  };

  const resetPreferences = async () => {
    if (!confirm('Are you sure you want to reset all learned preferences?')) return;

    try {
      const { error } = await supabase.functions.invoke('manage-preferences', {
        body: { action: 'reset' }
      });

      if (error) throw error;

      toast.success('Preferences reset successfully');
      loadPreferences();
    } catch (error: any) {
      console.error('Failed to reset preferences:', error);
      toast.error('Failed to reset preferences');
    }
  };

  useEffect(() => {
    loadPreferences();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              <CardTitle>AI Learning & Preferences</CardTitle>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadPreferences} disabled={loading}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button variant="destructive" size="sm" onClick={resetPreferences}>
                Reset All
              </Button>
            </div>
          </div>
          <CardDescription>
            The AI learns your preferences automatically from every conversation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Learned Preferences */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Learned Preferences
            </h3>
            {preferences.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No preferences learned yet. Keep chatting and the AI will learn your style!
              </p>
            ) : (
              <div className="grid gap-3">
                {preferences.map((pref) => (
                  <div key={pref.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">{pref.preference_type}</Badge>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <TrendingUp className="w-3 h-3" />
                        {pref.confidence_score}% confident
                        <span>•</span>
                        {pref.learned_from_interactions} interactions
                      </div>
                    </div>
                    <div className="text-sm">
                      {typeof pref.preference_value === 'object' 
                        ? JSON.stringify(pref.preference_value, null, 2)
                        : pref.preference_value
                      }
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Learnings */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Recent Pattern Learning
            </h3>
            {learnings.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No patterns learned yet
              </p>
            ) : (
              <div className="space-y-2">
                {learnings.map((learning) => (
                  <div key={learning.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="outline" className="text-xs">
                        {learning.pattern_category}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Confidence: {learning.confidence}% • Reinforced {learning.times_reinforced}x
                      </span>
                    </div>
                    <p className="text-sm">{learning.learned_pattern}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
