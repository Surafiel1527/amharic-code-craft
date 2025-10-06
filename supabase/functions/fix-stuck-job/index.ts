import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobId } = await req.json();
    
    if (!jobId) {
      throw new Error('Job ID is required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔧 Attempting to fix stuck job:', jobId);
    
    // Get the stuck job
    const { data: job, error: jobError } = await supabaseClient
      .from('ai_generation_jobs')
      .select('*')
      .eq('id', jobId)
      .single();
    
    if (jobError || !job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    console.log(`📊 Job status: ${job.status}, Progress: ${job.progress}%, Step: ${job.current_step}`);

    // Reset the job to allow it to continue
    const { error: resetError } = await supabaseClient
      .from('ai_generation_jobs')
      .update({
        status: 'running',
        current_step: job.current_step || 'Resuming...',
        updated_at: new Date().toISOString(),
        retry_count: (job.retry_count || 0) + 1,
        error_message: null,
        output_data: {
          ...(job.output_data || {}),
          manual_fix_applied: true,
          fixed_at: new Date().toISOString(),
          previous_status: job.status
        }
      })
      .eq('id', jobId);
    
    if (resetError) {
      throw resetError;
    }

    // Trigger the orchestrator again
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    
    try {
      const orchestratorResponse = await fetch(`${SUPABASE_URL}/functions/v1/smart-orchestrator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          jobId: jobId,
          mode: 'resume'
        })
      });
      
      if (!orchestratorResponse.ok) {
        console.error('Failed to resume orchestrator:', await orchestratorResponse.text());
      } else {
        console.log('✅ Orchestrator resumed successfully');
      }
    } catch (orchError) {
      console.error('Error triggering orchestrator:', orchError);
    }

    console.log('✅ Job fixed and resumed');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Job has been reset and resumed',
        jobId: jobId,
        previousStatus: job.status,
        newStatus: 'running'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error fixing stuck job:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
