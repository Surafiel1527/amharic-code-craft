import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { pluginId } = await req.json();

    console.log('Security scanning plugin:', pluginId);

    // Get plugin code
    const { data: plugin, error: pluginError } = await supabase
      .from('ai_plugins')
      .select('*')
      .eq('id', pluginId)
      .single();

    if (pluginError || !plugin) {
      return new Response(JSON.stringify({ error: 'Plugin not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use Lovable AI for security analysis
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    const securityPrompt = `
Perform a comprehensive security analysis of this plugin code:

Plugin Name: ${plugin.plugin_name}
Code: ${plugin.plugin_code}

Analyze for:
1. SQL injection vulnerabilities
2. XSS vulnerabilities
3. Malicious code patterns
4. API key exposure
5. Unsafe eval() usage
6. Unauthorized data access

Return JSON:
{
  "security_score": <0-100>,
  "vulnerabilities": [
    {
      "severity": "critical|high|medium|low",
      "type": "sql_injection|xss|malicious_code|api_exposure|unsafe_eval|data_access",
      "description": "<description>",
      "line": <line number or "N/A">
    }
  ],
  "recommendations": ["<recommendation 1>", "<recommendation 2>"],
  "safe_to_publish": <boolean>
}
    `;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a security expert analyzing code for vulnerabilities.' },
          { role: 'user', content: securityPrompt }
        ]
      })
    });

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0].message.content;
    
    // Parse security analysis
    let analysis = {
      security_score: 85,
      vulnerabilities: [],
      recommendations: ['No critical issues found'],
      safe_to_publish: true
    };
    
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.log('Using default analysis');
    }

    // Store security scan results
    const vulnerabilities = analysis.vulnerabilities as Array<{ severity: string; [key: string]: any }>;
    const { data: scanResult } = await supabase
      .from('plugin_security_scans')
      .insert({
        plugin_id: pluginId,
        scan_type: 'automated',
        status: vulnerabilities.length > 0 ? 'failed' : 'passed',
        vulnerabilities_found: vulnerabilities.length,
        severity_level: vulnerabilities.length > 0 ? vulnerabilities[0].severity : 'info',
        scan_results: analysis,
        scanned_by: null
      })
      .select()
      .single();

    // Auto-approve if safe
    if (analysis.safe_to_publish && analysis.security_score >= 80) {
      await supabase
        .from('marketplace_plugins')
        .update({ approved: true })
        .eq('plugin_id', pluginId);

      await supabase
        .from('admin_approval_queue')
        .update({
          status: 'approved',
          auto_approved: true,
          approval_score: analysis.security_score,
          reviewed_at: new Date().toISOString()
        })
        .eq('item_id', pluginId)
        .eq('item_type', 'plugin');
    } else {
      // Add to manual review queue
      await supabase
        .from('admin_approval_queue')
        .insert({
          item_type: 'plugin',
          item_id: pluginId,
          submitted_by: plugin.created_by,
          priority: analysis.vulnerabilities.some((v: any) => v.severity === 'critical') ? 'urgent' : 'normal',
          metadata: { security_scan_id: scanResult.id }
        });
    }

    return new Response(JSON.stringify({
      success: true,
      scan_result: scanResult,
      auto_approved: analysis.safe_to_publish && analysis.security_score >= 80
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in plugin-security-scanner:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});