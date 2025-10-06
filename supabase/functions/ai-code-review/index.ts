import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CodeReviewRequest {
  code: string;
  filePath: string;
  language?: string;
  previousLearnings?: any[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, filePath, language = 'typescript', previousLearnings = [] }: CodeReviewRequest = await req.json();

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

    console.log('🔍 AI Code Review started for:', filePath);

    // Create review session
    const { data: session, error: sessionError } = await supabaseClient
      .from('code_review_sessions')
      .insert({
        user_id: user.id,
        file_path: filePath,
        code_content: code,
        language
      })
      .select()
      .single();

    if (sessionError || !session) {
      throw new Error('Failed to create review session');
    }

    // Get user's learning patterns for personalized suggestions
    const { data: learnings } = await supabaseClient
      .from('code_review_learnings')
      .select('*')
      .eq('user_id', user.id)
      .order('confidence_score', { ascending: false })
      .limit(20);

    // Perform AI analysis
    const suggestions = await analyzeCode(code, filePath, language, learnings || []);

    // Store suggestions
    const suggestionRecords = suggestions.map((s: any) => ({
      session_id: session.id,
      line_number: s.lineNumber,
      suggestion_type: s.type,
      severity: s.severity,
      title: s.title,
      description: s.description,
      current_code: s.currentCode,
      suggested_fix: s.suggestedFix,
      explanation: s.explanation
    }));

    const { data: savedSuggestions, error: suggestionsError } = await supabaseClient
      .from('code_review_suggestions')
      .insert(suggestionRecords)
      .select();

    if (suggestionsError) {
      console.error('Error saving suggestions:', suggestionsError);
    }

    // Update session as completed
    await supabaseClient
      .from('code_review_sessions')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', session.id);

    console.log(`✅ Code review completed: ${suggestions.length} suggestions`);

    return new Response(
      JSON.stringify({
        success: true,
        sessionId: session.id,
        suggestions: savedSuggestions || suggestions,
        summary: {
          total: suggestions.length,
          critical: suggestions.filter((s: any) => s.severity === 'critical').length,
          warnings: suggestions.filter((s: any) => s.severity === 'warning').length,
          info: suggestions.filter((s: any) => s.severity === 'info').length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in ai-code-review:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function analyzeCode(
  code: string, 
  filePath: string, 
  language: string,
  learnings: any[]
): Promise<any[]> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

  const learningContext = learnings.length > 0 
    ? `\n**User's Learning Patterns (prioritize these):**\n${learnings.map(l => 
        `- ${l.pattern_type}: ${l.pattern_description} (acceptance: ${l.acceptance_rate}%, confidence: ${l.confidence_score}%)`
      ).join('\n')}`
    : '';

  const prompt = `Perform comprehensive code review on this ${language} code:

**File:** ${filePath}
**Code:**
\`\`\`${language}
${code}
\`\`\`
${learningContext}

**Analyze for:**
1. 🐛 Bugs & Runtime Errors
   - Null/undefined access
   - Type mismatches
   - Logic errors
   - Infinite loops
   - Memory leaks

2. 🔒 Security Issues
   - XSS vulnerabilities
   - SQL injection risks
   - Exposed secrets
   - Authentication issues

3. ⚡ Performance Problems
   - Unnecessary re-renders
   - Missing memoization
   - Inefficient algorithms
   - Large bundle size

4. 📐 Code Quality
   - DRY violations
   - SOLID principles
   - Naming conventions
   - Dead code

5. ✨ Best Practices
   - TypeScript strict mode
   - Error handling
   - Accessibility
   - Testing readiness

**Output JSON array:**
[
  {
    "lineNumber": 10,
    "type": "bug|security|performance|style|best-practice",
    "severity": "critical|warning|info",
    "title": "Short description",
    "description": "Detailed explanation of the issue",
    "currentCode": "problematic code snippet",
    "suggestedFix": "corrected code snippet",
    "explanation": "Why this fix works and improves the code"
  }
]

**Rules:**
- Focus on issues that will cause runtime errors or bugs
- Prioritize user's learning patterns
- Provide actionable, specific fixes
- Include line numbers for each suggestion
- Order by severity (critical first)`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-pro', // Use Pro for thorough analysis
      messages: [
        { role: 'system', content: 'You are an expert code reviewer specializing in catching bugs before runtime. Respond with JSON array only.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: "json_object" }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AI API Error:', response.status, errorText);
    throw new Error(`AI API failed: ${response.status}`);
  }

  const data = await response.json();
  const result = JSON.parse(data.choices[0].message.content);
  
  return result.suggestions || result || [];
}
