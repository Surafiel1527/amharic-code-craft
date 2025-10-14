/**
 * MEGA MIND EDGE FUNCTION
 * AGI-level autonomous development endpoint
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { MegaMindOrchestrator } from "../_shared/megaMindOrchestrator.ts";

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

    const {
      userRequest,
      userId,
      conversationId,
      projectId,
      operation
    } = await req.json();

    const megaMind = new MegaMindOrchestrator(supabase);

    // STEP 1: UNDERSTAND
    if (operation === 'understand') {
      const decision = await megaMind.understand({
        userRequest,
        userId,
        conversationId,
        projectId
      });

      return new Response(
        JSON.stringify({
          success: true,
          decision
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // STEP 2: RESEARCH
    if (operation === 'research') {
      const { topic } = await req.json();
      const research = await megaMind.research(topic);

      return new Response(
        JSON.stringify({
          success: true,
          research
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // STEP 3: EXECUTE
    if (operation === 'execute') {
      const { decision, resources } = await req.json();
      const result = await megaMind.execute(
        decision,
        new Map(Object.entries(resources || {}))
      );

      return new Response(
        JSON.stringify({
          success: result.success,
          result
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // STEP 4: TEST
    if (operation === 'test') {
      const { generated, testStrategy } = await req.json();
      const testResult = await megaMind.test(generated, testStrategy);

      return new Response(
        JSON.stringify({
          success: testResult.passed,
          testResult
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // STEP 5: FIX
    if (operation === 'fix') {
      const { errors } = await req.json();
      const fixes = await megaMind.autoFix(errors);

      return new Response(
        JSON.stringify({
          success: fixes.fixed,
          fixes
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid operation' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Mega Mind] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
