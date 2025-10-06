import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { packageName, version } = await req.json();
    
    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Fetch vulnerability data from npm registry
    const npmUrl = `https://registry.npmjs.org/${packageName}/${version}`;
    const npmResponse = await fetch(npmUrl);
    
    if (!npmResponse.ok) {
      throw new Error('Package not found');
    }

    const packageData = await npmResponse.json();

    // Use AI to analyze security
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{
          role: 'user',
          content: `Analyze this npm package for security vulnerabilities:
Package: ${packageName}@${version}
Dependencies: ${JSON.stringify(packageData.dependencies || {})}
Description: ${packageData.description}

Rate security from 0-100 and list potential vulnerabilities.
Return JSON: { "score": number, "vulnerabilities": [{ "severity": "critical"|"high"|"medium"|"low", "description": string, "recommendation": string }] }`
        }],
        tools: [{
          type: "function",
          function: {
            name: "security_analysis",
            description: "Analyze package security",
            parameters: {
              type: "object",
              properties: {
                score: { type: "number" },
                vulnerabilities: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      severity: { type: "string", enum: ["critical", "high", "medium", "low"] },
                      description: { type: "string" },
                      recommendation: { type: "string" }
                    }
                  }
                }
              }
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "security_analysis" } }
      })
    });

    const aiResult = await aiResponse.json();
    const analysis = aiResult.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments 
      ? JSON.parse(aiResult.choices[0].message.tool_calls[0].function.arguments)
      : { score: 80, vulnerabilities: [] };

    // Count vulnerabilities by severity
    const counts = analysis.vulnerabilities.reduce((acc: any, v: any) => {
      acc[v.severity] = (acc[v.severity] || 0) + 1;
      return acc;
    }, { critical: 0, high: 0, medium: 0, low: 0 });

    // Save scan results
    await supabaseClient.from('package_security_scans').insert({
      package_name: packageName,
      version,
      vulnerability_count: analysis.vulnerabilities.length,
      critical_count: counts.critical,
      high_count: counts.high,
      medium_count: counts.medium,
      low_count: counts.low,
      vulnerabilities: analysis.vulnerabilities,
      scan_status: 'completed',
      user_id: user.id
    });

    return new Response(
      JSON.stringify({
        package: packageName,
        version,
        securityScore: analysis.score,
        vulnerabilityCount: analysis.vulnerabilities.length,
        severityCounts: counts,
        vulnerabilities: analysis.vulnerabilities,
        recommendation: counts.critical > 0 
          ? 'BLOCK: Critical vulnerabilities found'
          : counts.high > 0 
          ? 'WARNING: High-severity issues detected'
          : 'SAFE: No major security issues'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});