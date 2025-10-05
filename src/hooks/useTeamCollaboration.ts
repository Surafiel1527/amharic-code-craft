/**
 * Team Collaboration Hook - Phase 3B
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useTeamCollaboration(sessionId?: string) {
  const [participants, setParticipants] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const sendMessage = useCallback(async (content: string, codeBlock?: string) => {
    if (!sessionId) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await (supabase as any).from('collaborative_messages').insert({
      session_id: sessionId,
      user_id: user.id,
      role: 'user',
      content,
      code_block: codeBlock
    });
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    const channel = (supabase as any).channel('team-collab')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'collaborative_messages', filter: `session_id=eq.${sessionId}` },
        (payload: any) => setMessages(prev => [...prev, payload.new]))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  return { participants, messages, loading, sendMessage };
}
