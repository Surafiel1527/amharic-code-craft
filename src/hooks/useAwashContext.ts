/**
 * React Hook for Awash Platform Context
 * Provides real-time workspace state to components
 */

import { useState, useEffect } from 'react';
import { awashContext, AwashPlatformContext } from '@/services/awashPlatformContext';

export interface UseAwashContextOptions {
  conversationId?: string;
  projectId?: string;
  refreshInterval?: number; // in milliseconds
}

export interface UseAwashContextReturn {
  context: AwashPlatformContext | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to access Awash platform context
 */
export function useAwashContext(options: UseAwashContextOptions = {}): UseAwashContextReturn {
  const {
    conversationId,
    projectId,
    refreshInterval = 0 // 0 means no auto-refresh
  } = options;
  
  const [context, setContext] = useState<AwashPlatformContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const loadContext = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const newContext = await awashContext.buildContext(
        conversationId,
        projectId
      );
      
      setContext(newContext);
    } catch (err) {
      console.error('Failed to load Awash context:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };
  
  // Initial load
  useEffect(() => {
    loadContext();
  }, [conversationId, projectId]);
  
  // Auto-refresh if interval is set
  useEffect(() => {
    if (refreshInterval <= 0) return;
    
    const interval = setInterval(loadContext, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval, conversationId, projectId]);
  
  return {
    context,
    isLoading,
    error,
    refresh: loadContext
  };
}

/**
 * Hook to get just the workspace state (lighter version)
 */
export function useAwashWorkspace(projectId?: string) {
  const { context, isLoading, error } = useAwashContext({ projectId });
  
  return {
    workspace: context?.workspace || null,
    isLoading,
    error
  };
}
