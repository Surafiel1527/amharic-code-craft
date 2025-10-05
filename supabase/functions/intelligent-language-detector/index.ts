import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DetectionResult {
  language: 'python' | 'javascript' | 'typescript' | 'react' | 'java' | 'go' | 'rust' | 'unknown';
  framework?: string;
  confidence: number;
  reasoning: string;
  recommendedRuntime: 'browser' | 'node' | 'deno' | 'python' | 'jvm' | 'native';
  suggestedPackages: string[];
  projectStructure: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userRequest, existingCode = null } = await req.json();

    if (!userRequest) {
      throw new Error('User request is required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const { data: { user } } = await supabaseClient.auth.getUser(
      req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
    );

    const analysisPrompt = `You are an expert programming language detector and project analyzer.

Analyze this user request and determine:
1. What programming language they want to use
2. What framework (if any) they need
3. What runtime environment is best
4. What packages/dependencies they'll need
5. What project structure makes sense

User Request: "${userRequest}"
${existingCode ? `\nExisting Code Context: ${existingCode.substring(0, 500)}` : ''}

IMPORTANT DETECTION RULES:
- Python keywords: "python", "flask", "django", "fastapi", "pandas", "numpy", "machine learning", "data analysis", "script", "automation", "AI model", "jupyter"
- JavaScript/Node keywords: "node", "express", "api server", "backend", "npm"
- React keywords: "react", "component", "jsx", "frontend", "ui", "website", "web app" (when UI focused)
- Game keywords: "game", "phaser", "three.js", "pygame" (python for pygame, react for web games)
- Data Science: "data", "analysis", "visualization", "ml", "ai" → Python
- Automation/Scripts: "automate", "script", "task", "bot" → Python

Return ONLY valid JSON:
{
  "language": "python|javascript|typescript|react|java|go|rust|unknown",
  "framework": "flask|django|fastapi|express|react|vue|pygame|none",
  "confidence": 0-100,
  "reasoning": "Brief explanation of detection",
  "recommendedRuntime": "browser|node|deno|python|jvm|native",
  "suggestedPackages": ["package1", "package2"],
  "projectStructure": ["file1.py", "file2.py", "requirements.txt"]
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
          content: analysisPrompt
        }],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Extract JSON from response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    let result: DetectionResult;

    if (jsonMatch) {
      result = JSON.parse(jsonMatch[0]);
    } else {
      // Fallback detection based on keywords
      const lower = userRequest.toLowerCase();
      
      if (lower.includes('python') || lower.includes('flask') || lower.includes('django') || 
          lower.includes('pandas') || lower.includes('numpy') || lower.includes('script')) {
        result = {
          language: 'python',
          framework: lower.includes('flask') ? 'flask' : lower.includes('django') ? 'django' : 'none',
          confidence: 85,
          reasoning: 'Detected Python keywords in request',
          recommendedRuntime: 'python',
          suggestedPackages: ['flask'] as string[],
          projectStructure: ['app.py', 'requirements.txt', 'README.md']
        };
      } else {
        result = {
          language: 'react',
          confidence: 70,
          reasoning: 'Default to React for web applications',
          recommendedRuntime: 'browser',
          suggestedPackages: [],
          projectStructure: []
        };
      }
    }

    // Log detection to database
    if (user) {
      await supabaseClient.from('language_detections').insert({
        user_id: user.id,
        user_request: userRequest,
        detected_language: result.language,
        framework: result.framework,
        confidence: result.confidence,
        recommended_runtime: result.recommendedRuntime,
      });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Language detection error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
