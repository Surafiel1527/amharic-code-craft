import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { options, context } = await req.json();

    const analyzedOptions = options.map((option: any) => {
      let score = 50;
      if (option.estimatedEffort === 'low') score += 15;
      else if (option.estimatedEffort === 'medium') score += 10;
      if (option.riskLevel === 'low') score += 20;
      else if (option.riskLevel === 'medium') score += 10;
      score += option.pros.length * 5 - option.cons.length * 3;
      return { ...option, score: Math.min(100, Math.max(0, score)) };
    });

    const bestOption = analyzedOptions.reduce((best: any, current: any) => 
      current.score > best.score ? current : best
    );

    const confidence = 0.85;

    return new Response(
      JSON.stringify({
        success: true,
        decision: {
          bestOption,
          alternatives: analyzedOptions.filter((opt: any) => opt.id !== bestOption.id),
          confidence,
          reasoning: `${bestOption.name} recommended: ${bestOption.estimatedEffort} effort, ${bestOption.riskLevel} risk`
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
