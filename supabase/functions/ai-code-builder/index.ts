import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, message, history, currentCode, projectContext, error } = await req.json();
    
    console.log('🤖 AI Code Builder request:', { action, hasCode: !!currentCode, historyLength: history?.length });

    let systemPrompt = `You are an advanced AI code builder assistant that can:
1. CREATE full projects from descriptions (like "Create fully operational bingo game")
2. MODIFY existing code based on requests (like "add login functionality")
3. FIX errors automatically with explanations
4. BUILD large complex projects incrementally

CRITICAL RULES:
- Generate complete, working HTML/CSS/JS code
- Always respond with valid code in <code></code> tags
- For new projects, create complete standalone HTML files
- For modifications, return the FULL updated code
- When fixing errors, explain what was wrong and how you fixed it
- Use modern best practices and responsive design
- Include all necessary CSS and JavaScript inline
- Make code production-ready and fully functional

Current Action: ${action}
${currentCode ? 'Current Code Length: ' + currentCode.length + ' characters' : 'No existing code'}
${error ? 'Error to Fix: ' + error : ''}`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: message }
    ];

    console.log('🚀 Calling Lovable AI with Gemini 2.5 Pro...');
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages,
        temperature: 0.7,
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        throw new Error('rate_limit');
      } else if (response.status === 402) {
        throw new Error('payment_required');
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    console.log('✅ AI response received, length:', aiResponse.length);

    // Extract code from response
    const codeMatch = aiResponse.match(/<code>([\s\S]*?)<\/code>/);
    const code = codeMatch ? codeMatch[1].trim() : null;
    
    // Extract explanation (text before or after code)
    let explanation = aiResponse;
    if (codeMatch) {
      explanation = aiResponse.replace(/<code>[\s\S]*?<\/code>/, '').trim();
    }

    console.log('📦 Extracted:', { hasCode: !!code, explanationLength: explanation.length });

    return new Response(
      JSON.stringify({
        success: true,
        code,
        explanation,
        action,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error: any) {
    console.error('💥 Error in ai-code-builder:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        type: error.message.includes('rate_limit') ? 'rate_limit' : 
              error.message.includes('payment_required') ? 'payment_required' : 'unknown'
      }),
      { 
        status: error.message.includes('rate_limit') ? 429 : 
                error.message.includes('payment_required') ? 402 : 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
