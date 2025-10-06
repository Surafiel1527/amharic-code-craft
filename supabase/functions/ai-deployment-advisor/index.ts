import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalysisRequest {
  deploymentId: string;
  projectFiles: Record<string, string>;
  envVariables?: Record<string, string>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { deploymentId, projectFiles, envVariables }: AnalysisRequest = await req.json();

    console.log(`AI analyzing deployment: ${deploymentId}`);

    // Analyze code with AI
    const filesAnalysis = Object.entries(projectFiles).map(([path, content]) => 
      `File: ${path}\nSize: ${content.length} bytes\nLines: ${content.split('\n').length}`
    ).join('\n\n');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an expert deployment advisor. Analyze project files and provide:
1. Security vulnerabilities
2. Performance optimizations
3. Dependency recommendations
4. Bundle size concerns
5. Compatibility issues
6. Best practices violations

Return structured JSON with: { validations: [{ type, status, issues[], recommendations[] }], overallScore: 0-100, criticalIssues: number }`
          },
          {
            role: 'user',
            content: `Analyze this deployment:\n\n${filesAnalysis}\n\nEnvironment variables: ${Object.keys(envVariables || {}).length} configured`
          }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'analyze_deployment',
            description: 'Analyze deployment and return structured validation results',
            parameters: {
              type: 'object',
              properties: {
                validations: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      type: { type: 'string', enum: ['security', 'performance', 'compatibility', 'dependencies', 'bundle_size'] },
                      status: { type: 'string', enum: ['passed', 'warning', 'failed'] },
                      issues: { type: 'array', items: { type: 'string' } },
                      recommendations: { type: 'array', items: { type: 'string' } }
                    },
                    required: ['type', 'status', 'issues', 'recommendations']
                  }
                },
                overallScore: { type: 'number', minimum: 0, maximum: 100 },
                criticalIssues: { type: 'number' }
              },
              required: ['validations', 'overallScore', 'criticalIssues']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'analyze_deployment' } }
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI analysis failed: ${await aiResponse.text()}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error('AI did not return structured analysis');
    }

    const analysis = JSON.parse(toolCall.function.arguments);
    
    console.log('AI Analysis:', JSON.stringify(analysis, null, 2));

    // Store validations in database
    const validationPromises = analysis.validations.map((validation: any) =>
      supabase
        .from('deployment_validations' as any)
        .insert({
          deployment_id: deploymentId,
          validation_type: validation.type,
          status: validation.status,
          issues: validation.issues,
          recommendations: validation.recommendations,
          completed_at: new Date().toISOString()
        } as any)
    );

    await Promise.all(validationPromises);

    // Learn from this analysis
    const learningPromises = analysis.validations
      .filter((v: any) => v.recommendations.length > 0)
      .map((v: any) =>
        v.recommendations.map((rec: string) =>
          supabase.rpc('upsert_deployment_learning', {
            p_pattern_name: `${v.type}_${rec.substring(0, 50)}`,
            p_pattern_type: v.status === 'passed' ? 'best_practice' : 'optimization',
            p_recommendation: rec,
            p_conditions: { validation_type: v.type }
          })
        )
      );

    await Promise.all(learningPromises.flat());

    // Send alert if critical issues found
    if (analysis.criticalIssues > 0) {
      await supabase.rpc('send_alert', {
        p_alert_type: 'deployment_validation_failed',
        p_severity: 'error',
        p_title: `${analysis.criticalIssues} Critical Issues Found`,
        p_message: `Pre-deployment validation found ${analysis.criticalIssues} critical issues that need attention.`,
        p_metadata: {
          deployment_id: deploymentId,
          overall_score: analysis.overallScore
        }
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        analysis: {
          ...analysis,
          deploymentId
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('AI advisor error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
