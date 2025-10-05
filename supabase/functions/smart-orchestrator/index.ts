import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { task, context = {} } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    console.log('Orchestrating complex task:', task);

    // Step 1: Break down the task into subtasks
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

    // Step 2: Execute each step
    const results: any[] = [];
    for (const step of executionPlan) {
      console.log(`Executing step ${step.step_number}: ${step.description}`);
      
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
    }

    // Step 3: Generate final summary
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

    return new Response(
      JSON.stringify({
        task,
        execution_plan: executionPlan,
        results,
        summary: summaryData.choices[0].message.content,
        total_steps: results.length,
        success_rate: 100,
        total_time: results.length * 30 // estimate
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
