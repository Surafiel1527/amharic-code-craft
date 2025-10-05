import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AutoFixRequest {
  code: string;
  language: string;
  issues: Array<{
    line: number;
    severity: string;
    message: string;
    rule?: string;
  }>;
  validationResultId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      code, 
      language, 
      issues,
      validationResultId 
    }: AutoFixRequest = await req.json();

    if (!code || !issues || issues.length === 0) {
      throw new Error('Code and issues are required');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔧 Generating auto-fixes for ${issues.length} issues`);

    // Check for learned patterns first
    const fixSuggestions = await Promise.all(issues.map(async (issue) => {
      const issueSignature = generateIssueSignature(issue);
      
      // Check if we have a learned pattern for this issue
      const { data: pattern } = await supabaseClient
        .from('validation_patterns')
        .select('*')
        .eq('issue_signature', issueSignature)
        .eq('language', language)
        .order('confidence_score', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pattern && pattern.confidence_score > 0.7) {
        console.log(`✨ Using learned pattern for issue: ${issue.message}`);
        return {
          issue,
          fixedCode: applyLearnedPattern(code, issue, pattern.fix_strategy),
          explanation: pattern.fix_strategy.explanation,
          confidence: pattern.confidence_score,
          fromPattern: true
        };
      }

      // Generate new fix using AI
      return await generateAIFix(code, language, issue);
    }));

    // Store fix suggestions in database
    const storedSuggestions = await Promise.all(fixSuggestions.map(async (suggestion) => {
      const { data, error } = await supabaseClient
        .from('auto_fix_suggestions')
        .insert({
          user_id: user.id,
          validation_result_id: validationResultId || null,
          issue_type: suggestion.issue.rule || 'unknown',
          issue_description: suggestion.issue.message,
          original_code: code,
          fixed_code: suggestion.fixedCode,
          fix_explanation: suggestion.explanation,
          confidence_score: suggestion.confidence
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to store fix suggestion:', error);
      }

      return data;
    }));

    console.log(`✅ Generated ${fixSuggestions.length} fix suggestions`);

    return new Response(
      JSON.stringify({
        success: true,
        fixes: fixSuggestions.map((fix, index) => ({
          ...fix,
          id: storedSuggestions[index]?.id
        }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Auto-fix error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateIssueSignature(issue: any): string {
  const signature = `${issue.severity}:${issue.message}:${issue.rule || 'unknown'}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(signature);
  return btoa(String.fromCharCode(...data));
}

function applyLearnedPattern(code: string, issue: any, fixStrategy: any): string {
  // Apply the learned fix strategy
  const lines = code.split('\n');
  const targetLine = issue.line - 1;
  
  if (targetLine >= 0 && targetLine < lines.length) {
    const originalLine = lines[targetLine];
    
    if (fixStrategy.type === 'replace') {
      lines[targetLine] = fixStrategy.replacement;
    } else if (fixStrategy.type === 'insert') {
      lines.splice(targetLine, 0, fixStrategy.insertion);
    } else if (fixStrategy.type === 'remove') {
      lines.splice(targetLine, 1);
    }
  }
  
  return lines.join('\n');
}

async function generateAIFix(code: string, language: string, issue: any) {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

  const fixPrompt = `Fix this ${language} code issue:

**Original Code:**
\`\`\`${language}
${code}
\`\`\`

**Issue at line ${issue.line}:**
- Severity: ${issue.severity}
- Message: ${issue.message}
- Rule: ${issue.rule || 'unknown'}

**Generate:**
1. Fixed version of the ENTIRE code
2. Clear explanation of what was fixed and why
3. Confidence score (0.0 to 1.0)

**Output Format (JSON only):**
{
  "fixedCode": "complete fixed code here",
  "explanation": "detailed explanation of the fix",
  "confidence": 0.95
}`;

  const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'You are a code fixing expert. Always respond with valid JSON only.' },
        { role: 'user', content: fixPrompt }
      ],
      response_format: { type: "json_object" }
    }),
  });

  if (!aiResponse.ok) {
    throw new Error(`AI API error: ${aiResponse.status}`);
  }

  const aiData = await aiResponse.json();
  const result = JSON.parse(aiData.choices[0].message.content);

  return {
    issue,
    fixedCode: result.fixedCode,
    explanation: result.explanation,
    confidence: result.confidence,
    fromPattern: false
  };
}
