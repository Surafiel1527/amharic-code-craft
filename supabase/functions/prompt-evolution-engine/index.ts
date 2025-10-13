/**
 * Prompt Evolution Engine
 * Phase 4B: Autonomous Prompt Improvement
 * 
 * Analyzes prompt performance and generates improved versions
 * Can be triggered manually or run on a schedule
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { runEvolutionCycle } from '../_shared/promptEvolution.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Get user from auth header for audit trail
    const authHeader = req.headers.get('Authorization');
    let userId = 'system';
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
      
      if (!userError && user) {
        userId = user.id;
      }
    }

    console.log('🧬 Prompt Evolution Engine triggered by:', userId);

    // Run the evolution cycle
    const results = await runEvolutionCycle(
      supabaseClient,
      LOVABLE_API_KEY,
      userId
    );

    // Log the activity
    await supabaseClient.from('audit_logs').insert({
      user_id: userId === 'system' ? null : userId,
      action: 'prompt_evolution_cycle',
      resource_type: 'prompt_evolution',
      metadata: {
        results,
        triggered_at: new Date().toISOString()
      },
      severity: 'info'
    });

    console.log('✅ Prompt evolution cycle complete:', results);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Prompt evolution cycle complete',
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error: any) {
    console.error('❌ Prompt evolution error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
