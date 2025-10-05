import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CodeReview {
  overallScore: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  categories: {
    security: { score: number; issues: string[] };
    performance: { score: number; issues: string[] };
    maintainability: { score: number; issues: string[] };
    bestPractices: { score: number; issues: string[] };
    accessibility: { score: number; issues: string[] };
  };
  improvements: Array<{
    type: 'critical' | 'high' | 'medium' | 'low';
    title: string;
    description: string;
    codeSnippet?: string;
    suggestedFix: string;
  }>;
  strengths: string[];
  optimizedCode?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, language = 'javascript', filename = 'code.js' } = await req.json();

    if (!code) {
      throw new Error('Code is required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const { data: { user } } = await supabaseClient.auth.getUser(
      req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
    );

    const reviewPrompt = `You are an expert code reviewer with deep knowledge of software engineering best practices, security, performance optimization, and maintainability.

Perform a comprehensive code review of this ${language} code:

\`\`\`${language}
${code}
\`\`\`

File: ${filename}

Analyze the code across these dimensions:
1. **Security**: SQL injection, XSS, CSRF, authentication issues, data exposure
2. **Performance**: Algorithmic efficiency, memory usage, unnecessary computations
3. **Maintainability**: Code organization, naming conventions, documentation
4. **Best Practices**: Design patterns, SOLID principles, DRY, KISS
5. **Accessibility**: If UI code, check ARIA labels, keyboard navigation, screen readers

Return ONLY valid JSON:
{
  "overallScore": 0-100,
  "grade": "A+|A|B|C|D|F",
  "categories": {
    "security": {
      "score": 0-100,
      "issues": ["Specific security issues found"]
    },
    "performance": {
      "score": 0-100,
      "issues": ["Performance bottlenecks"]
    },
    "maintainability": {
      "score": 0-100,
      "issues": ["Code quality issues"]
    },
    "bestPractices": {
      "score": 0-100,
      "issues": ["Violations of best practices"]
    },
    "accessibility": {
      "score": 0-100,
      "issues": ["Accessibility issues"]
    }
  },
  "improvements": [
    {
      "type": "critical|high|medium|low",
      "title": "Issue title",
      "description": "Detailed explanation",
      "codeSnippet": "problematic code",
      "suggestedFix": "improved code or explanation"
    }
  ],
  "strengths": ["What the code does well"],
  "optimizedCode": "Fully optimized version of the entire code"
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
          content: reviewPrompt
        }],
        temperature: 0.3,
        max_tokens: 6000,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    let review: CodeReview;

    if (jsonMatch) {
      review = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Failed to parse review from AI response');
    }

    // Log to database
    if (user) {
      await supabaseClient.from('code_reviews').insert({
        user_id: user.id,
        filename,
        language,
        code_length: code.length,
        overall_score: review.overallScore,
        grade: review.grade,
        security_score: review.categories.security.score,
        performance_score: review.categories.performance.score,
        maintainability_score: review.categories.maintainability.score,
        improvements_count: review.improvements.length,
      });
    }

    return new Response(JSON.stringify(review), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Code review error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
