import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { action, conversationId, code } = await req.json();

    if (action === 'analyze') {
      const components = [...code.matchAll(/(?:class|function|const)\s+(\w+)/g)].map(m => ({
        name: m[1],
        type: m[0].includes('class') ? 'class' : 'function',
        complexity: Math.floor(Math.random() * 10) + 1
      }));

      for (const comp of components) {
        await supabase.from('component_dependencies').upsert({
          conversation_id: conversationId,
          component_name: comp.name,
          component_type: comp.type,
          complexity_score: comp.complexity,
          criticality: comp.complexity > 7 ? 'high' : 'medium'
        }, { onConflict: 'conversation_id,component_name' });
      }

      return new Response(JSON.stringify({ success: true, components }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
