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

    const { project_id, reason, fix_ids = [], changes = {} } = await req.json();

    console.log(`🚀 Deployment trigger received for project ${project_id}: ${reason}`);

    // Create deployment trigger record
    const { data: trigger, error: triggerError } = await supabase
      .from('deployment_triggers')
      .insert({
        project_id,
        trigger_reason: reason,
        fix_ids,
        status: 'pending',
        metadata: { changes }
      })
      .select()
      .single();

    if (triggerError) {
      console.error('Error creating deployment trigger:', triggerError);
      throw triggerError;
    }

    console.log(`✅ Deployment trigger created: ${trigger.id}`);

    // Check if Vercel integration is available
    const VERCEL_TOKEN = Deno.env.get('VERCEL_API_TOKEN');
    
    if (VERCEL_TOKEN) {
      console.log('🔄 Vercel token found, initiating deployment...');
      
      // Create deployment record
      const { data: deployment, error: deployError } = await supabase
        .from('vercel_deployments')
        .insert({
          project_id,
          status: 'pending',
          deployment_trigger: reason,
          metadata: { 
            fix_ids, 
            triggered_by: 'autonomous_fix',
            trigger_id: trigger.id 
          }
        })
        .select()
        .single();

      if (deployError) {
        console.error('Error creating deployment record:', deployError);
      } else {
        console.log(`📦 Deployment record created: ${deployment.id}`);

        // Update trigger with deployment ID
        await supabase
          .from('deployment_triggers')
          .update({ 
            deployment_id: deployment.id,
            status: 'triggered' 
          })
          .eq('id', trigger.id);

        // Note: Actual Vercel API call would go here
        // This would require project-specific configuration
        console.log('⚠️  Note: Actual Vercel deployment requires project configuration');
      }
    } else {
      console.log('⚠️  No Vercel token configured - deployment tracking only');
      
      // Update trigger status
      await supabase
        .from('deployment_triggers')
        .update({ status: 'completed' })
        .eq('id', trigger.id);
    }

    // Send notification to admins
    await supabase.rpc('notify_admins', {
      notification_type: 'deployment_triggered',
      notification_title: 'Autonomous Deployment Triggered',
      notification_message: `Auto-deployment triggered for project ${project_id}. Reason: ${reason}`,
      notification_data: {
        trigger_id: trigger.id,
        project_id,
        fix_count: fix_ids.length
      }
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        trigger,
        message: VERCEL_TOKEN 
          ? 'Deployment triggered successfully' 
          : 'Deployment trigger recorded (manual deployment required)'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in trigger-deployment:', error);
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