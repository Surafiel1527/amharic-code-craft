import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Code Quality Analyzer - Analyzes generated code for quality issues
 * Suggests improvements before issues become errors
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, context } = await req.json();

    if (!code) {
      throw new Error('Code is required');
    }

    console.log('🔬 Analyzing code quality...');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Get relevant error patterns to avoid known issues
    const { data: knownIssues } = await supabaseClient
      .from('error_patterns')
      .select('error_type, error_pattern, solution')
      .eq('resolution_status', 'solved')
      .order('frequency', { ascending: false })
      .limit(20);

    const aiPrompt = `You are an expert code reviewer specializing in React, TypeScript, and Supabase applications.

ANALYZE THIS CODE FOR QUALITY ISSUES:
\`\`\`
${code}
\`\`\`

CONTEXT:
${context ? JSON.stringify(context) : 'No additional context'}

KNOWN ISSUES TO AVOID:
${knownIssues?.map(issue => `- ${issue.error_type}: ${issue.error_pattern}`).join('\n')}

REVIEW CHECKLIST:
1. **Common Mistakes**:
   - Accessing properties without null checks
   - Missing optional chaining (?.)
   - Rendering objects directly in JSX
   - Not cleaning up useEffect subscriptions
   - Missing dependency arrays in useEffect
   - Using .single() without null handling
   
2. **Security**:
   - Exposed API keys or secrets
   - SQL injection vulnerabilities
   - XSS vulnerabilities
   - Missing input validation
   
3. **Performance**:
   - Unnecessary re-renders
   - Missing React.memo or useMemo
   - Large bundle size issues
   - Unoptimized database queries
   
4. **Best Practices**:
   - Proper TypeScript types
   - Consistent error handling
   - Accessible UI components
   - Proper semantic HTML

5. **Potential Bugs**:
   - Race conditions
   - Memory leaks
   - Infinite loops
   - Off-by-one errors

PROVIDE:
- Quality score (0-100)
- List of issues found (if any)
- Severity of each issue (low/medium/high/critical)
- Specific recommendations
- Improved code snippets for critical issues

Return JSON ONLY in this format:
{
  "qualityScore": 85,
  "issues": [
    {
      "type": "null-safety",
      "severity": "high",
      "line": "const name = user.profile.name",
      "problem": "Accessing nested property without null check",
      "recommendation": "Use optional chaining: const name = user?.profile?.name",
      "fixedCode": "const name = user?.profile?.name ?? 'Unknown'"
    }
  ],
  "summary": "Overall assessment of code quality",
  "preventiveActions": ["action1", "action2"]
}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: aiPrompt }],
        response_format: { type: "json_object" }
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const analysis = JSON.parse(aiData.choices[0].message.content);

    console.log(`✅ Code analysis complete. Quality score: ${analysis.qualityScore}`);

    // Store analysis results
    await supabaseClient
      .from('code_analysis')
      .insert({
        project_id: context?.projectId || null,
        analysis_type: 'quality',
        score: analysis.qualityScore,
        issues: analysis.issues,
        suggestions: analysis.preventiveActions
      });

    // If critical issues found, create proactive error report
    const criticalIssues = analysis.issues?.filter((i: any) => i.severity === 'critical') || [];
    if (criticalIssues.length > 0) {
      console.log('🚨 Critical issues detected, creating preventive report...');
      
      for (const issue of criticalIssues) {
        await supabaseClient.functions.invoke('report-error', {
          body: {
            errorType: 'CodeQualityIssue',
            errorMessage: issue.problem,
            source: 'code-analysis',
            severity: 'high',
            context: {
              preventive: true,
              codeSnippet: issue.line,
              recommendation: issue.recommendation,
              fixedCode: issue.fixedCode
            }
          }
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        ...analysis
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in code quality analyzer:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});