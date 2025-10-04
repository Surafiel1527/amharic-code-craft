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
    const { action, userId, generatedCode, context, success, minConfidence } = await req.json();

    if (action === 'learn') {
      const patterns = ['react-hooks', 'styling', 'api-calls'].map(type => ({
        type,
        code: generatedCode.substring(0, 100)
      }));

      for (const pattern of patterns) {
        await supabase.from('cross_project_patterns').insert({
          user_id: userId,
          pattern_name: `${pattern.type}-pattern`,
          pattern_type: pattern.type,
          pattern_code: pattern.code,
          contexts: [context],
          confidence_score: 50,
          success_rate: success ? 100 : 50
        });
      }

      return new Response(JSON.stringify({ success: true, patternsLearned: patterns.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } else if (action === 'retrieve') {
      const { data: patterns } = await supabase.from('cross_project_patterns')
        .select('*')
        .eq('user_id', userId)
        .gte('confidence_score', minConfidence || 50)
        .limit(5);

      return new Response(JSON.stringify({ success: true, patterns: patterns || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
