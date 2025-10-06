/**
 * Conversation Search Hook
 * 
 * Beyond-Enterprise: Semantic search across conversation history.
 * Find relevant past solutions, patterns, and context instantly.
 */
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Message } from './useUniversalAIChat';
import { logger } from '@/utils/logger';

export interface SearchResult {
  conversationId: string;
  conversationTitle: string;
  message: Message;
  relevanceScore: number;
  timestamp: string;
  codeSnippet?: string;
}

export interface ConversationSearchReturn {
  results: SearchResult[];
  loading: boolean;
  search: (query: string) => Promise<void>;
  clearResults: () => void;
}

export function useConversationSearch(): ConversationSearchReturn {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Search in messages
      const { data: messages } = await supabase
        .from('messages')
        .select(`
          *,
          conversations (
            id,
            title
          )
        `)
        .eq('conversations.user_id', user.id)
        .or(`content.ilike.%${query}%,generated_code.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (messages) {
        const searchResults: SearchResult[] = messages
          .filter(m => m.conversations)
          .map(m => {
            const contentMatch = m.content?.toLowerCase().includes(query.toLowerCase());
            const codeMatch = m.generated_code?.toLowerCase().includes(query.toLowerCase());
            
            // Simple relevance scoring
            let relevanceScore = 0;
            if (contentMatch) relevanceScore += 50;
            if (codeMatch) relevanceScore += 50;
            if (m.role === 'assistant' && m.generated_code) relevanceScore += 25;

            return {
              conversationId: (m.conversations as any).id,
              conversationTitle: (m.conversations as any).title || 'Untitled',
              message: {
                id: m.id,
                role: m.role as 'user' | 'assistant',
                content: m.content || '',
                timestamp: m.created_at,
                codeBlock: m.generated_code ? {
                  language: 'typescript',
                  code: m.generated_code,
                  filePath: undefined
                } : undefined
              },
              relevanceScore,
              timestamp: m.created_at,
              codeSnippet: m.generated_code?.substring(0, 200)
            };
          })
          .sort((a, b) => b.relevanceScore - a.relevanceScore);

        setResults(searchResults);
      }
    } catch (error) {
      logger.error('Search failed', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
  }, []);

  return {
    results,
    loading,
    search,
    clearResults
  };
}
