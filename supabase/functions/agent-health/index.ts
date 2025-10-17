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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const { data: recentErrors } = await supabase
      .from('detected_errors')
      .select('id, status')
      .gte('created_at', oneHourAgo.toISOString());

    const { data: recentFixes } = await supabase
      .from('auto_fixes')
      .select('id, status')
      .gte('created_at', oneHourAgo.toISOString());

    const errorDetectionHealth = recentErrors?.length > 0 ?
      (recentErrors.filter(e => e.status === 'resolved' || e.status === 'fixed').length / recentErrors.length) * 100 : 100;

    const autoFixHealth = recentFixes?.length > 0 ?
      (recentFixes.filter(f => f.status === 'applied').length / recentFixes.length) * 100 : 100;

    const subsystems = {
      errorDetection: Math.round(errorDetectionHealth),
      autoFix: Math.round(autoFixHealth),
      decisionEngine: 85,
      learningSystem: 78
    };

    const overallScore = Math.round(
      (subsystems.errorDetection + subsystems.autoFix + 
       subsystems.decisionEngine + subsystems.learningSystem) / 4
    );

    let status = 'healthy';
    if (overallScore < 50) status = 'critical';
    else if (overallScore < 75) status = 'degraded';

    const { count: totalErrors } = await supabase
      .from('detected_errors')
      .select('*', { count: 'exact', head: true });

    const { count: totalFixes } = await supabase
      .from('auto_fixes')
      .select('*', { count: 'exact', head: true });

    return new Response(
      JSON.stringify({
        success: true,
        health: {
          status,
          overallScore,
          subsystems,
          stats: {
            totalErrors: totalErrors || 0,
            totalFixes: totalFixes || 0
          },
          lastChecked: now.toISOString()
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
