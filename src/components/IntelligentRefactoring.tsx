import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Wand2, CheckCircle2, AlertCircle, Code2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RefactoringSuggestion {
  id: string;
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  category: 'performance' | 'readability' | 'maintainability' | 'security';
  before: string;
  after: string;
  lineStart: number;
  lineEnd: number;
}

interface IntelligentRefactoringProps {
  code: string;
  filePath: string;
  onApplySuggestion: (newCode: string) => void;
}

export function IntelligentRefactoring({ code, filePath, onApplySuggestion }: IntelligentRefactoringProps) {
  const [suggestions, setSuggestions] = useState<RefactoringSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());

  const analyzecode = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Route to unified-code-operations for refactoring
      const { data, error } = await supabase.functions.invoke('unified-code-operations', {
        body: {
          operation: 'refactor',
          code,
          filePath
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      setSuggestions(data.suggestions || []);
      toast.success(`Found ${data.suggestions?.length || 0} refactoring opportunities`);
    } catch (error: any) {
      console.error('Refactoring analysis error:', error);
      toast.error(error.message || 'Failed to analyze code');
    } finally {
      setLoading(false);
    }
  };

  const toggleSuggestion = (id: string) => {
    const newSelected = new Set(selectedSuggestions);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedSuggestions(newSelected);
  };

  const applySelected = () => {
    if (selectedSuggestions.size === 0) {
      toast.error('No suggestions selected');
      return;
    }

    let newCode = code;
    const selected = suggestions.filter(s => selectedSuggestions.has(s.id));
    
    // Sort by line number descending to avoid offset issues
    selected.sort((a, b) => b.lineStart - a.lineStart);

    selected.forEach(suggestion => {
      newCode = newCode.replace(suggestion.before, suggestion.after);
    });

    onApplySuggestion(newCode);
    toast.success(`Applied ${selected.length} refactoring(s)`);
    setSelectedSuggestions(new Set());
    setSuggestions([]);
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-orange-600 bg-orange-50';
      case 'low': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'performance': return '⚡';
      case 'readability': return '📖';
      case 'maintainability': return '🔧';
      case 'security': return '🔒';
      default: return '💡';
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wand2 className="w-5 h-5" />
          <h3 className="font-semibold">Intelligent Refactoring</h3>
        </div>
        <Button
          onClick={analyzecode}
          disabled={loading}
          size="sm"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4 mr-2" />
              Analyze
            </>
          )}
        </Button>
      </div>

      {suggestions.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''} found
            </span>
            <Button
              onClick={applySelected}
              disabled={selectedSuggestions.size === 0}
              size="sm"
              variant="default"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Apply Selected ({selectedSuggestions.size})
            </Button>
          </div>

          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {suggestions.map(suggestion => (
                <Card key={suggestion.id} className="p-3">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedSuggestions.has(suggestion.id)}
                        onCheckedChange={() => toggleSuggestion(suggestion.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">{getCategoryIcon(suggestion.category)}</span>
                          <Badge variant="outline" className={getImpactColor(suggestion.impact)}>
                            {suggestion.impact} impact
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {suggestion.category}
                          </Badge>
                        </div>
                        <h4 className="font-medium text-sm mb-1">{suggestion.title}</h4>
                        <p className="text-xs text-muted-foreground">{suggestion.description}</p>
                      </div>
                    </div>

                    {/* Code Diff */}
                    <div className="space-y-2 pl-8">
                      <div className="bg-red-50 dark:bg-red-950/20 rounded p-2 border-l-2 border-red-500">
                        <div className="text-xs font-mono text-red-700 dark:text-red-400 mb-1">
                          - Before
                        </div>
                        <pre className="text-xs overflow-x-auto">
                          <code>{suggestion.before}</code>
                        </pre>
                      </div>
                      <div className="bg-green-50 dark:bg-green-950/20 rounded p-2 border-l-2 border-green-500">
                        <div className="text-xs font-mono text-green-700 dark:text-green-400 mb-1">
                          + After
                        </div>
                        <pre className="text-xs overflow-x-auto">
                          <code>{suggestion.after}</code>
                        </pre>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground pl-8">
                      <Code2 className="w-3 h-3" />
                      Lines {suggestion.lineStart}-{suggestion.lineEnd}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </>
      )}

      {suggestions.length === 0 && !loading && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Click "Analyze" to get intelligent refactoring suggestions</p>
        </div>
      )}
    </Card>
  );
}
