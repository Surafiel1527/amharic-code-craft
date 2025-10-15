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
  const [isComplete, setIsComplete] = useState(false);

  // ✅ ENTERPRISE FIX: Reset state when conversation/project changes
  useEffect(() => {
    console.log('🔄 Conversation/Project changed, resetting realtime AI state');
    setStatus({
      status: 'idle',
      message: 'Ready',
      timestamp: new Date().toISOString()
    });
    setCodeUpdates([]);
    setErrors([]);
    setHasStarted(false);
    setIsComplete(false);
  }, [projectId, conversationId]);

  useEffect(() => {
    const channelId = projectId || conversationId;
    if (!channelId) return;

    console.log('📡 Setting up realtime subscriptions for:', channelId);

    // Subscribe to AI status updates
    const statusChannel = supabase
      .channel(`ai-status-${channelId}`)
      .on('broadcast', { event: 'status-update' }, ({ payload }) => {
        console.log('📡 Received status update:', payload);
        
        // Mark that AI has started working
        if (payload.status !== 'idle') {
          setHasStarted(true);
        }
        
        // Mark as complete if we receive complete/idle with completion message
        if ((payload.status === 'complete' || payload.status === 'idle') && 
            (payload.message?.includes('complete') || payload.message?.includes('done'))) {
          setIsComplete(true);
        }
        
        // Mark as complete if we receive error status
        if (payload.status === 'error') {
          setIsComplete(true);
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
      console.log('🧹 Cleaning up realtime subscriptions for:', channelId);
      supabase.removeChannel(statusChannel);
      supabase.removeChannel(codeChannel);
    };
  }, [projectId, conversationId]);

  // ✅ ENTERPRISE FIX: AI is "active" only if:
  // 1. It has started working AND
  // 2. It's not in a final state (complete/error) OR it's still actively processing
  const isActive = hasStarted && !isComplete && status.status !== 'idle';

  return {
    status,
    codeUpdates,
    errors,
    isActive,
    hasStarted,
    isComplete
  };
}
