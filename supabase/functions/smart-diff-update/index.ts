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
    const { userRequest, currentCode } = await req.json();
    
    if (!currentCode) {
      throw new Error('Current code is required for smart diff updates');
    }

    const startTime = Date.now();
    
    // Use Lovable AI for fast, targeted updates
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `You are an expert code modifier. Apply the requested change to the existing code with minimal modifications.
Only change what's necessary to fulfill the request. Maintain all existing functionality and structure.
Return ONLY the complete updated code, no explanations.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: `Current Code:\n\`\`\`html\n${currentCode}\n\`\`\`\n\nUser Request: ${userRequest}\n\nProvide the updated code:` 
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    let updatedCode = aiResponse.choices[0].message.content;
    
    // Extract code from markdown if present
    const codeBlockMatch = updatedCode.match(/```(?:html)?\n([\s\S]*?)\n```/);
    if (codeBlockMatch) {
      updatedCode = codeBlockMatch[1];
    }

    const processingTime = Date.now() - startTime;
    
    // Generate explanation
    const explanation = `Updated the code based on your request: "${userRequest}"`;

    return new Response(
      JSON.stringify({
        success: true,
        updatedCode,
        explanation,
        processingTime,
        method: 'smart-diff'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Smart diff update error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
