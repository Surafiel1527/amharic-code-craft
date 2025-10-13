/**
 * UX-Pattern Integration Engine
 * 
 * Automatically adjusts pattern confidence based on user frustration data.
 * Triggers interventions when patterns consistently cause poor UX.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createLogger } from '../_shared/logger.ts';
import { runUXPatternIntegrationCycle } from '../_shared/uxPatternIntegration.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logger = createLogger('ux-pattern-integration-engine');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify authentication (admin only for manual triggers)
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        logger.warn('Unauthorized access attempt');
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if user is admin
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      if (!roles) {
        logger.warn('Non-admin attempted to trigger integration', { userId: user.id });
        return new Response(
          JSON.stringify({ error: 'Admin access required' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      logger.info('Manual trigger by admin', { userId: user.id });
    } else {
      logger.info('Scheduled/automatic trigger');
    }

    // Run the integration cycle
    const results = await runUXPatternIntegrationCycle(supabase);

    // Log to audit trail
    await supabase.from('audit_logs').insert({
      action: 'ux_pattern_integration_cycle',
      resource_type: 'pattern_learning',
      severity: 'info',
      metadata: {
        results,
        trigger_type: authHeader ? 'manual' : 'automatic'
      }
    });

    logger.info('Integration cycle completed successfully', results);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'UX-Pattern integration cycle completed',
        results
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    logger.error('Integration cycle failed', {}, error as Error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
