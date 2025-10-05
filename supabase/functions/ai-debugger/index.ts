import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DebugResult {
  errorAnalysis: {
    errorType: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    rootCause: string;
    affectedComponents: string[];
  };
  solutions: Array<{
    approach: string;
    confidence: number;
    steps: string[];
    codeChanges: Array<{
      file: string;
      before: string;
      after: string;
      explanation: string;
    }>;
  }>;
  preventionTips: string[];
  relatedErrors: string[];
  estimatedFixTime: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      errorMessage, 
      stackTrace = '', 
      code = '', 
      consoleOutput = '',
      language = 'javascript'
    } = await req.json();

    if (!errorMessage) {
      throw new Error('Error message is required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const { data: { user } } = await supabaseClient.auth.getUser(
      req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
    );

    const debugPrompt = `You are an expert debugging AI with deep knowledge of ${language} and software debugging.

Analyze this error and provide comprehensive debugging information:

**Error Message:**
${errorMessage}

**Stack Trace:**
${stackTrace || 'Not provided'}

**Related Code:**
\`\`\`${language}
${code || 'Not provided'}
\`\`\`

**Console Output:**
${consoleOutput || 'Not provided'}

Your task:
1. Identify the root cause of the error
2. Determine error severity and type
3. Provide multiple solution approaches ranked by confidence
4. Give specific code changes with before/after examples
5. Suggest prevention strategies
6. List related common errors

Return ONLY valid JSON:
{
  "errorAnalysis": {
    "errorType": "TypeError|ReferenceError|SyntaxError|etc",
    "severity": "critical|high|medium|low",
    "rootCause": "Clear explanation of what caused the error",
    "affectedComponents": ["List of affected parts"]
  },
  "solutions": [
    {
      "approach": "Solution approach name",
      "confidence": 0-100,
      "steps": ["Step 1", "Step 2"],
      "codeChanges": [
        {
          "file": "filename.js",
          "before": "problematic code",
          "after": "fixed code",
          "explanation": "Why this fixes it"
        }
      ]
    }
  ],
  "preventionTips": ["How to avoid this in future"],
  "relatedErrors": ["Similar errors to watch for"],
  "estimatedFixTime": "5 minutes|15 minutes|1 hour|etc"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{
          role: "user",
          content: debugPrompt
        }],
        temperature: 0.3,
        max_tokens: 5000,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    let result: DebugResult;

    if (jsonMatch) {
      result = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Failed to parse debug result from AI response');
    }

    // Log to database
    if (user) {
      await supabaseClient.from('debug_sessions').insert({
        user_id: user.id,
        error_message: errorMessage,
        error_type: result.errorAnalysis.errorType,
        severity: result.errorAnalysis.severity,
        solutions_count: result.solutions.length,
        language,
      });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('AI debugger error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
