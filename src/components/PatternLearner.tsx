import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function PatternLearner() {
  useEffect(() => {
    const channel = supabase
      .channel('pattern_learning')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'generation_analytics'
        },
        async (payload) => {
          // Learn from successful generations
          if (payload.new.success) {
            console.log('📚 Learning from successful generation:', payload.new);
            // Pattern will be stored by the orchestrator
          }
        }
      )
      .subscribe();

    console.log('✅ Pattern learning system activated and listening');

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return null;
}
