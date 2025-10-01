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
    const { code } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Starting security scan...');

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
            content: `You are a security expert. Analyze HTML/CSS/JavaScript code for security vulnerabilities and provide actionable recommendations.

Focus on:
- XSS (Cross-Site Scripting) vulnerabilities
- SQL Injection risks
- Insecure direct object references
- Missing input validation
- Unsafe use of eval() or innerHTML
- Missing Content Security Policy
- Insecure external resource loading
- CSRF vulnerabilities
- Sensitive data exposure

Return a JSON object with this structure:
{
  "score": <0-100>,
  "vulnerabilities": [
    {
      "severity": "critical|high|medium|low",
      "type": "XSS|SQLi|CSRF|etc",
      "description": "Clear description of the issue",
      "location": "Where in the code",
      "recommendation": "How to fix it"
    }
  ],
  "summary": "Overall security assessment"
}`
          },
          {
            role: 'user',
            content: `Analyze this code for security vulnerabilities:\n\n${code}`
          }
        ],
        tools: [{
          type: "function",
          function: {
            name: "report_vulnerabilities",
            description: "Report security vulnerabilities found in the code",
            parameters: {
              type: "object",
              properties: {
                score: { 
                  type: "number",
                  description: "Security score from 0-100"
                },
                vulnerabilities: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      severity: { 
                        type: "string",
                        enum: ["critical", "high", "medium", "low"]
                      },
                      type: { type: "string" },
                      description: { type: "string" },
                      location: { type: "string" },
                      recommendation: { type: "string" }
                    },
                    required: ["severity", "type", "description", "location", "recommendation"]
                  }
                },
                summary: { type: "string" }
              },
              required: ["score", "vulnerabilities", "summary"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "report_vulnerabilities" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response received');

    const toolCall = data.choices[0].message.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call in response');
    }

    const analysis = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify(analysis),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in security-scan function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
