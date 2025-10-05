import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalysisRequest {
  code: string;
  filePath: string;
  projectId?: string;
  analysisType: 'quality' | 'errors' | 'performance' | 'all';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseClient.auth.getUser(token);

    if (!user) {
      throw new Error('Unauthorized');
    }

    const { code, filePath, projectId, analysisType }: AnalysisRequest = await req.json();

    // Perform AI-powered code analysis
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: `You are an expert code analyzer. Analyze code for:
1. Quality issues (code smells, anti-patterns, violations)
2. Potential runtime errors (null references, type errors, logic bugs)
3. Performance bottlenecks (inefficient algorithms, memory leaks)
4. Security vulnerabilities (XSS, injection risks, exposed secrets)

Return ONLY valid JSON with this structure:
{
  "qualityScore": number (0-100),
  "maintainabilityScore": number (0-100),
  "securityScore": number (0-100),
  "performanceScore": number (0-100),
  "predictedIssues": [
    {
      "type": "error|warning|info",
      "category": "quality|error|performance|security",
      "line": number,
      "message": string,
      "severity": "low|medium|high|critical",
      "suggestion": string
    }
  ],
  "errorPredictions": [
    {
      "type": string,
      "description": string,
      "line": number,
      "confidence": number (0-1),
      "preventionTip": string,
      "autoFixAvailable": boolean
    }
  ],
  "refactoringSuggestions": [
    {
      "type": string,
      "priority": "low|medium|high",
      "description": string,
      "suggestedCode": string,
      "reasoning": string,
      "difficulty": "easy|medium|hard"
    }
  ],
  "performanceInsights": [
    {
      "type": string,
      "severity": "info|warning|critical",
      "title": string,
      "description": string,
      "recommendation": string
    }
  ]
}`
          },
          {
            role: 'user',
            content: `Analyze this ${filePath} code:\n\n${code}`
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI analysis failed:', errorText);
      throw new Error('AI analysis failed');
    }

    const aiData = await response.json();
    const analysisText = aiData.choices[0].message.content;
    
    // Parse JSON from AI response
    let analysis;
    try {
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      analysis = JSON.parse(jsonMatch ? jsonMatch[0] : analysisText);
    } catch (e) {
      console.error('Failed to parse AI response:', analysisText);
      throw new Error('Failed to parse analysis results');
    }

    // Store predictions in database
    const predictions = {
      user_id: user.id,
      project_id: projectId,
      file_path: filePath,
      code_snapshot: code,
      quality_score: analysis.qualityScore || 50,
      maintainability_score: analysis.maintainabilityScore || 50,
      security_score: analysis.securityScore || 50,
      performance_score: analysis.performanceScore || 50,
      predicted_issues: analysis.predictedIssues || [],
      suggestions: analysis.refactoringSuggestions || [],
      confidence: 0.85
    };

    await supabaseClient
      .from('code_quality_predictions')
      .insert(predictions);

    // Store error predictions
    if (analysis.errorPredictions?.length > 0) {
      const errorPreds = analysis.errorPredictions.map((ep: any) => ({
        user_id: user.id,
        project_id: projectId,
        file_path: filePath,
        error_type: ep.type,
        severity: ep.severity || 'medium',
        description: ep.description,
        predicted_line: ep.line,
        confidence: ep.confidence || 0.7,
        prevention_suggestion: ep.preventionTip,
        auto_fix_available: ep.autoFixAvailable || false
      }));

      await supabaseClient
        .from('error_predictions')
        .insert(errorPreds);
    }

    // Store refactoring suggestions
    if (analysis.refactoringSuggestions?.length > 0) {
      const refactorSuggestions = analysis.refactoringSuggestions.map((rs: any) => ({
        user_id: user.id,
        project_id: projectId,
        file_path: filePath,
        suggestion_type: rs.type,
        priority: rs.priority,
        description: rs.description,
        current_code: code,
        suggested_code: rs.suggestedCode,
        reasoning: rs.reasoning,
        difficulty: rs.difficulty
      }));

      await supabaseClient
        .from('refactoring_suggestions')
        .insert(refactorSuggestions);
    }

    // Store performance insights
    if (analysis.performanceInsights?.length > 0) {
      const perfInsights = analysis.performanceInsights.map((pi: any) => ({
        user_id: user.id,
        project_id: projectId,
        insight_type: pi.type,
        severity: pi.severity,
        title: pi.title,
        description: pi.description,
        affected_files: [filePath],
        recommendation: pi.recommendation
      }));

      await supabaseClient
        .from('performance_insights')
        .insert(perfInsights);
    }

    // Create smart notification if critical issues found
    const criticalIssues = analysis.predictedIssues?.filter((i: any) => 
      i.severity === 'critical'
    ) || [];

    if (criticalIssues.length > 0) {
      await supabaseClient
        .from('smart_notifications')
        .insert({
          user_id: user.id,
          notification_type: 'critical_issue',
          priority: 'urgent',
          title: `${criticalIssues.length} Critical Issue${criticalIssues.length > 1 ? 's' : ''} Found`,
          message: `Found ${criticalIssues.length} critical issue(s) in ${filePath}`,
          metadata: { filePath, issues: criticalIssues }
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis: {
          scores: {
            quality: analysis.qualityScore,
            maintainability: analysis.maintainabilityScore,
            security: analysis.securityScore,
            performance: analysis.performanceScore
          },
          issues: analysis.predictedIssues,
          errors: analysis.errorPredictions,
          refactoring: analysis.refactoringSuggestions,
          performance: analysis.performanceInsights
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Predictive analysis error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
