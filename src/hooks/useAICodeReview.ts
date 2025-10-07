import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CodeSuggestion {
  id: string;
  lineNumber: number;
  type: 'bug' | 'security' | 'performance' | 'style' | 'best-practice';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  currentCode: string;
  suggestedFix: string;
  explanation: string;
  accepted: boolean;
}

export interface ReviewSummary {
  total: number;
  critical: number;
  warnings: number;
  info: number;
}

interface UseAICodeReviewOptions {
  autoReviewOnSave?: boolean;
  debounceMs?: number;
}

export const useAICodeReview = (options: UseAICodeReviewOptions = {}) => {
  const { autoReviewOnSave = true, debounceMs = 2000 } = options;
  const { toast } = useToast();
  
  const [suggestions, setSuggestions] = useState<CodeSuggestion[]>([]);
  const [isReviewing, setIsReviewing] = useState(false);
  const [summary, setSummary] = useState<ReviewSummary>({ total: 0, critical: 0, warnings: 0, info: 0 });
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Debounced review function
  const reviewCode = useCallback(async (code: string, filePath: string, language: string = 'typescript') => {
    if (!code || code.trim().length === 0) return;

    setIsReviewing(true);
    
    try {
      // Get user's learning patterns
      const { data: learnings } = await supabase
        .from('code_review_learnings')
        .select('*')
        .order('confidence_score', { ascending: false })
        .limit(20);

      // Call AI code review function
      const { data, error } = await supabase.functions.invoke('unified-ai-workers', {
        body: { 
          operation: 'code_review',
          params: {
            code,
            filePath, 
            language,
            previousLearnings: learnings || []
          }
        }
      });

      if (error) throw error;

      if (data.success) {
        setSuggestions(data.suggestions);
        setSummary(data.summary);
        setCurrentSessionId(data.sessionId);

        if (data.summary.critical > 0) {
          toast({
            title: '🐛 Critical Issues Found',
            description: `${data.summary.critical} critical issue${data.summary.critical > 1 ? 's' : ''} detected`,
            variant: 'destructive'
          });
        } else if (data.summary.warnings > 0) {
          toast({
            title: '⚠️ Suggestions Available',
            description: `${data.summary.warnings} improvement${data.summary.warnings > 1 ? 's' : ''} suggested`,
          });
        } else if (data.summary.info > 0) {
          toast({
            title: '✨ Code Review Complete',
            description: `${data.summary.info} tip${data.summary.info > 1 ? 's' : ''} available`,
          });
        }
      }
    } catch (error) {
      console.error('Code review error:', error);
      toast({
        title: 'Review Failed',
        description: 'Unable to analyze code. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsReviewing(false);
    }
  }, [toast]);

  // Accept a suggestion
  const acceptSuggestion = useCallback(async (suggestionId: string) => {
    try {
      const { error } = await supabase
        .from('code_review_suggestions')
        .update({ 
          accepted: true, 
          accepted_at: new Date().toISOString() 
        })
        .eq('id', suggestionId);

      if (error) throw error;

      // Update local state
      setSuggestions(prev => 
        prev.map(s => s.id === suggestionId ? { ...s, accepted: true } : s)
      );

      toast({
        title: '✅ Suggestion Applied',
        description: 'Your code has been improved!',
      });

      // The database trigger will automatically update learning patterns
    } catch (error) {
      console.error('Error accepting suggestion:', error);
      toast({
        title: 'Error',
        description: 'Failed to accept suggestion',
        variant: 'destructive'
      });
    }
  }, [toast]);

  // Dismiss a suggestion
  const dismissSuggestion = useCallback((suggestionId: string) => {
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
  }, []);

  // Get suggestions by line
  const getSuggestionsForLine = useCallback((lineNumber: number) => {
    return suggestions.filter(s => s.lineNumber === lineNumber);
  }, [suggestions]);

  // Get learning stats
  const getLearningStats = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('code_review_learnings')
        .select('*')
        .order('acceptance_rate', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching learning stats:', error);
      return [];
    }
  }, []);

  return {
    suggestions,
    isReviewing,
    summary,
    currentSessionId,
    reviewCode,
    acceptSuggestion,
    dismissSuggestion,
    getSuggestionsForLine,
    getLearningStats
  };
};
