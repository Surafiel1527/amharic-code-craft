import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function analyzePackageInstallation(packageName: string, errorContext: any): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

  const prompt = `You are a package management expert. Analyze this dependency installation request.

**Package:** ${packageName}
**Error Context:**
${JSON.stringify(errorContext, null, 2)}

**Determine:**
1. Should this package be installed?
2. What version should be used (latest, specific, compatible)?
3. Are there any peer dependencies needed?
4. Should it be a dev dependency or production dependency?
5. Are there potential conflicts with existing packages?
6. What's the recommended installation strategy?

**Output Format (JSON only):**
{
  "shouldInstall": true|false,
  "reason": "why or why not",
  "packageName": "exact package name",
  "version": "latest|specific version",
  "isDev": true|false,
  "peerDependencies": ["list of peer deps if needed"],
  "potentialConflicts": ["packages that might conflict"],
  "installationStrategy": "description of how to install safely",
  "alternativePackages": ["better alternatives if any"],
  "confidence": 0.85
}`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'You are a package management expert. Always respond with valid JSON only.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: "json_object" }
    }),
  });

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { packageName, errorMessage, errorContext, projectContext } = await req.json();

    if (!packageName) {
      throw new Error('Package name is required');
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

    console.log(`📦 Analyzing package installation: ${packageName}`);

    // Check if we have intelligence about this package
    const { data: pastInstallations } = await supabaseClient
      .from('dependency_intelligence')
      .select('*')
      .eq('package_name', packageName)
      .eq('success', true)
      .order('created_at', { ascending: false })
      .limit(5);

    // Analyze the installation with AI
    const analysis = await analyzePackageInstallation(packageName, {
      errorMessage,
      errorContext,
      projectContext,
      pastInstallations
    });

    console.log(`📊 Analysis result:`, {
      shouldInstall: analysis.shouldInstall,
      confidence: analysis.confidence,
      strategy: analysis.installationStrategy
    });

    if (!analysis.shouldInstall) {
      return new Response(
        JSON.stringify({
          success: true,
          shouldInstall: false,
          reason: analysis.reason,
          alternativePackages: analysis.alternativePackages,
          message: `❌ Not recommended to install ${packageName}: ${analysis.reason}`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store the installation intelligence
    const { error: insertError } = await supabaseClient
      .from('dependency_intelligence')
      .insert({
        package_name: packageName,
        version: analysis.version,
        installation_context: errorMessage || 'manual',
        success: true,
        resolution_strategy: analysis.installationStrategy,
        related_packages: analysis.peerDependencies,
        project_context: projectContext || {}
      });

    if (insertError) {
      console.error('Failed to store dependency intelligence:', insertError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        shouldInstall: true,
        analysis,
        message: `✅ ${packageName} should be installed using: ${analysis.installationStrategy}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in auto-install-dependency:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
