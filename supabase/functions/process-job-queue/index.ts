import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔄 Job queue processor started...');

    // Get jobs that need processing
    const { data: jobs, error: fetchError } = await supabase
      .from('ai_generation_jobs')
      .select('*')
      .in('status', ['queued', 'running'])
      .order('created_at', { ascending: true })
      .limit(5);

    if (fetchError) {
      console.error('Error fetching jobs:', fetchError);
      throw fetchError;
    }

    if (!jobs || jobs.length === 0) {
      console.log('✅ No jobs to process');
      return new Response(
        JSON.stringify({ processed: 0, message: 'No jobs in queue' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Found ${jobs.length} jobs to process`);
    const results = [];

    for (const job of jobs) {
      try {
        // Check if job is stale (no update in 5 minutes and still running)
        const lastUpdate = new Date(job.updated_at);
        const now = new Date();
        const minutesSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);

        if (job.status === 'running' && minutesSinceUpdate > 5) {
          console.log(`⚠️ Job ${job.id} is stale (no update for ${minutesSinceUpdate.toFixed(1)} min), marking as failed`);
          
          await supabase
            .from('ai_generation_jobs')
            .update({
              status: 'failed',
              error_message: 'Job timed out - no progress for 5+ minutes',
              updated_at: new Date().toISOString()
            })
            .eq('id', job.id);

          results.push({ id: job.id, action: 'timeout' });
          continue;
        }

        // Process the job by calling the orchestrator
        console.log(`🚀 Processing job ${job.id} (${job.job_type})`);

        // Mark as running if it's queued
        if (job.status === 'queued') {
          await supabase
            .from('ai_generation_jobs')
            .update({
              status: 'running',
              started_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', job.id);
        }

        // Call the mega-mind-orchestrator
        const orchestratorResponse = await fetch(
          `${supabaseUrl}/functions/v1/mega-mind-orchestrator`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              jobId: job.id,
              request: job.input_data?.prompt || 'Continue processing',
              requestType: job.job_type || 'orchestration',
              context: {
                conversationId: job.conversation_id,
                projectId: job.project_id,
                resumeFromStep: job.completed_steps || 0
              }
            }),
          }
        );

        if (!orchestratorResponse.ok) {
          const errorText = await orchestratorResponse.text();
          console.error(`❌ Orchestrator failed for job ${job.id}:`, errorText);
          
          await supabase
            .from('ai_generation_jobs')
            .update({
              status: 'failed',
              error_message: `Orchestrator error: ${errorText.substring(0, 500)}`,
              updated_at: new Date().toISOString()
            })
            .eq('id', job.id);

          results.push({ id: job.id, action: 'failed', error: errorText.substring(0, 100) });
          continue;
        }

        const orchestratorResult = await orchestratorResponse.json();
        console.log(`✅ Job ${job.id} processed successfully`);
        
        results.push({ id: job.id, action: 'processed', result: orchestratorResult });

      } catch (jobError) {
        console.error(`❌ Error processing job ${job.id}:`, jobError);
        
        await supabase
          .from('ai_generation_jobs')
          .update({
            status: 'failed',
            error_message: jobError instanceof Error ? jobError.message : 'Unknown processing error',
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id);

        results.push({ id: job.id, action: 'error', error: jobError instanceof Error ? jobError.message : 'Unknown error' });
      }
    }

    console.log(`✨ Processed ${results.length} jobs`);

    return new Response(
      JSON.stringify({
        processed: results.length,
        results,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Queue processor error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        processed: 0
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
