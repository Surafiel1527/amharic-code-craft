import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

type AIStatus = 'idle' | 'thinking' | 'reading' | 'editing' | 'fixing' | 'analyzing' | 'generating' | 'error' | 'complete';

interface StatusUpdate {
  status: AIStatus;
  message: string;
  timestamp: string;
  progress?: number;
  errors?: string[];
  filesGenerated?: number;
  duration?: number;
}

interface CodeUpdate {
  component: string;
  code: string;
  timestamp: string;
  status: 'pending' | 'rendering' | 'complete';
}

interface UseRealtimeAIProps {
  projectId?: string;
  conversationId?: string;
}

export function useRealtimeAI({ projectId, conversationId }: UseRealtimeAIProps) {
  const [status, setStatus] = useState<StatusUpdate>({
    status: 'idle',
    message: 'Ready',
    timestamp: new Date().toISOString()
  });
  const [codeUpdates, setCodeUpdates] = useState<CodeUpdate[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    const channelId = projectId || conversationId;
    if (!channelId) return;

    // Subscribe to AI status updates
    const statusChannel = supabase
      .channel(`ai-status-${channelId}`)
      .on('broadcast', { event: 'status-update' }, ({ payload }) => {
        console.log('📡 Received status update:', payload);
        
        // Mark that AI has started working
        if (payload.status !== 'idle') {
          setHasStarted(true);
        }
        
        setStatus({
          ...payload,
          timestamp: payload.timestamp || new Date().toISOString()
        });
        
        if (payload.errors) {
          setErrors(payload.errors);
        }
      })
      .subscribe();

    // Subscribe to code updates
    const codeChannel = supabase
      .channel(`preview-${channelId}`)
      .on('broadcast', { event: 'code-update' }, ({ payload }) => {
        setCodeUpdates(prev => [...prev, payload]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(statusChannel);
      supabase.removeChannel(codeChannel);
    };
  }, [projectId, conversationId]);

  // AI is "active" if it's not idle OR if it has started working
  // Once started, stay active until explicitly told to stop
  const isActive = status.status !== 'idle' || hasStarted;

  return {
    status,
    codeUpdates,
    errors,
    isActive,
    hasStarted
  };
}
