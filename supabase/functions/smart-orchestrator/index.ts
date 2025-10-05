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
    const { task, context = {}, projectId, conversationId, userId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    console.log('Orchestrating complex task:', task);

    // Initialize Supabase for real-time broadcasts and state persistence
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: req.headers.get('Authorization') ?? ''
          }
        }
      }
    );

    const channelId = projectId || conversationId || 'default';
    
    // Create job record for state persistence
    const { data: job, error: jobError } = await supabaseClient
      .from('ai_generation_jobs')
      .insert({
        user_id: userId,
        conversation_id: conversationId,
        project_id: projectId,
        job_type: 'orchestration',
        status: 'running',
        input_data: { task, context },
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (jobError) {
      console.error('Failed to create job:', jobError);
    }

    const jobId = job?.id;
    
    const broadcastStatus = async (status: string, message: string, progress?: number) => {
      try {
        // Update job in database
        if (jobId) {
          await supabaseClient
            .from('ai_generation_jobs')
            .update({
              progress: progress || 0,
              current_step: message,
              updated_at: new Date().toISOString()
            })
            .eq('id', jobId);
        }

        // Broadcast for real-time updates (for users currently watching)
        await supabaseClient.channel(`ai-status-${channelId}`).send({
          type: 'broadcast',
          event: 'status-update',
          payload: {
            status,
            message,
            timestamp: new Date().toISOString(),
            progress,
            jobId
          }
        });
      } catch (e) {
        console.error('Broadcast error:', e);
      }
    };

    // Define background task
    const processTask = async () => {
      try {
        await broadcastStatus('thinking', 'Breaking down your request into steps...', 5);

    // Step 1: Break down the task into subtasks
    await broadcastStatus('analyzing', 'Creating execution plan...', 15);
    const planResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an AI task orchestrator. Break down complex tasks into sequential steps.
Return a JSON array of steps with: step_number, description, action_type (code_gen, debug, review, deploy, analyze), estimated_time, dependencies.`
          },
          {
            role: 'user',
            content: `Task: ${task}\nContext: ${JSON.stringify(context)}`
          }
        ],
      }),
    });

    const planData = await planResponse.json();
    const planText = planData.choices[0].message.content;
    
    let executionPlan;
    try {
      const jsonMatch = planText.match(/```json\n([\s\S]*?)\n```/) || planText.match(/\[[\s\S]*\]/);
      executionPlan = JSON.parse(jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : planText);
    } catch {
      executionPlan = [
        { step_number: 1, description: task, action_type: 'code_gen', estimated_time: '5 min', dependencies: [] }
      ];
    }

    console.log('Execution plan created:', executionPlan.length, 'steps');
    await broadcastStatus('generating', `Plan created with ${executionPlan.length} steps. Starting execution...`, 30);

    // Step 2: Execute each step
    const results: any[] = [];
    for (let i = 0; i < executionPlan.length; i++) {
      const step = executionPlan[i];
      const progress = 30 + ((i / executionPlan.length) * 50);
      
      console.log(`Executing step ${step.step_number}: ${step.description}`);
      await broadcastStatus('editing', `Step ${step.step_number}/${executionPlan.length}: ${step.description}`, progress);
      
      const stepResponse: any = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'system',
              content: `You are executing step ${step.step_number} of a multi-step task. 
Action type: ${step.action_type}. Provide detailed, actionable output.`
            },
            {
              role: 'user',
              content: `Step: ${step.description}\nPrevious results: ${JSON.stringify(results.slice(-2))}\nContext: ${JSON.stringify(context)}`
            }
          ],
        }),
      });

      const stepData: any = await stepResponse.json();
      const stepResult: any = {
        step_number: step.step_number,
        description: step.description,
        action_type: step.action_type,
        output: stepData.choices[0].message.content,
        status: 'completed',
        completed_at: new Date().toISOString()
      };

      results.push(stepResult);
      
      // Broadcast code update if applicable
      if (step.action_type === 'code_gen' && stepResult.output) {
        await supabaseClient.channel(`preview-${channelId}`).send({
          type: 'broadcast',
          event: 'code-update',
          payload: {
            component: step.description,
            code: stepResult.output,
            timestamp: new Date().toISOString(),
            status: 'complete'
          }
        });
      }
    }

    // Step 3: Generate final summary
    await broadcastStatus('analyzing', 'Generating summary and recommendations...', 85);
    const summaryResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'Summarize the execution results and provide next steps.'
          },
          {
            role: 'user',
            content: `Task: ${task}\nResults: ${JSON.stringify(results)}`
          }
        ],
      }),
    });

    const summaryData = await summaryResponse.json();

    await broadcastStatus('idle', 'All steps completed successfully!', 100);

    // Mark job as completed
    if (jobId) {
      await supabaseClient
        .from('ai_generation_jobs')
        .update({
          status: 'completed',
          progress: 100,
          completed_at: new Date().toISOString(),
          output_data: {
            execution_plan: executionPlan,
            results,
            summary: summaryData.choices[0].message.content,
          }
        })
        .eq('id', jobId);
    }

    return {
      task,
      jobId,
      execution_plan: executionPlan,
      results,
      summary: summaryData.choices[0].message.content,
      total_steps: results.length,
      success_rate: 100,
      total_time: results.length * 30
    };
      } catch (error: any) {
        console.error('Error in background task:', error);
        
        // Mark job as failed
        if (jobId) {
          await supabaseClient
            .from('ai_generation_jobs')
            .update({
              status: 'failed',
              error_message: error.message,
              completed_at: new Date().toISOString()
            })
            .eq('id', jobId);
        }
        
        throw error;
      }
    };

    // Run background task and return immediately
    processTask().catch(error => {
      console.error('Background task error:', error);
    });

    // Return immediately with job ID
    return new Response(
      JSON.stringify({
        success: true,
        jobId,
        message: 'Processing started in background. You can safely close this window.',
        estimatedTime: '5-15 minutes'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in smart-orchestrator:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
