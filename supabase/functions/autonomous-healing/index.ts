/**
 * AUTONOMOUS HEALING EDGE FUNCTION
 * 
 * Automatically detects and heals errors in the system.
 * Can be triggered:
 * 1. Automatically via cron (every 5 minutes)
 * 2. Manually via HTTP request
 * 3. Via webhook from error monitoring
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { AutonomousHealingOrchestrator } from '../_shared/intelligence/autonomousHealingOrchestrator.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🏥 [AutonomousHealing] Starting healing cycle...');
    
    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Parse request body for options
    const { 
      targetErrorTypes, 
      maxErrors = 10, 
      autoApply = true,
      projectId,
      userId 
    } = req.method === 'POST' 
      ? await req.json() 
      : {};

    // Initialize healing orchestrator
    const orchestrator = new AutonomousHealingOrchestrator(
      supabase,
      projectId,
      userId
    );

    // Run healing cycle
    const result = await orchestrator.runHealingCycle({
      targetErrorTypes,
      maxErrors,
      autoApply
    });

    // Log result
    console.log('✅ [AutonomousHealing] Healing complete:', {
      errorsHealed: result.errorsHealed,
      escalations: result.escalations.length,
      learnings: result.learnings.length
    });

    // Return response
    return new Response(
      JSON.stringify({
        success: result.success,
        errorsHealed: result.errorsHealed,
        totalAttempts: result.attemptsLog.length,
        escalations: result.escalations.length,
        learnings: result.learnings,
        message: result.errorsHealed > 0 
          ? `Successfully healed ${result.errorsHealed} error(s)` 
          : result.escalations.length > 0
            ? `${result.escalations.length} error(s) require human intervention`
            : 'System is healthy - no errors detected',
        details: {
          attempts: result.attemptsLog,
          escalations: result.escalations
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('❌ [AutonomousHealing] Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
