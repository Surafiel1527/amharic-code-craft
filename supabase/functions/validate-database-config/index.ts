import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PROVIDER_DEFAULTS = {
  postgresql: { port: 5432, ssl: true },
  mysql: { port: 3306, ssl: true },
  mongodb: { port: 27017, srv: false },
  firebase: { region: 'us-central1' },
  supabase: { port: 5432, pooler: true }
};

const SECURITY_CHECKS = {
  postgresql: [
    { check: 'ssl', message: 'SSL should be enabled for production databases', severity: 'high' },
    { check: 'port', message: 'Using non-standard port can improve security', severity: 'medium' }
  ],
  mysql: [
    { check: 'ssl', message: 'SSL is required for secure connections', severity: 'high' },
    { check: 'allowPublicKeyRetrieval', message: 'Disable public key retrieval in production', severity: 'medium' }
  ],
  mongodb: [
    { check: 'srv', message: 'Use DNS SRV records for better reliability', severity: 'low' },
    { check: 'authSource', message: 'Specify authentication database explicitly', severity: 'medium' }
  ]
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { provider, credentials } = await req.json();

    console.log(`🔍 Validating ${provider} configuration...`);

    const validationResults = {
      isValid: true,
      issues: [] as any[],
      suggestions: [] as any[],
      securityScore: 100
    };

    // Check against defaults
    const defaults = PROVIDER_DEFAULTS[provider as keyof typeof PROVIDER_DEFAULTS];
    if (defaults) {
      Object.entries(defaults).forEach(([key, expectedValue]) => {
        const actualValue = credentials[key];
        if (actualValue !== undefined && actualValue !== expectedValue) {
          validationResults.suggestions.push({
            field: key,
            current: actualValue,
            recommended: expectedValue,
            reason: `Standard ${provider} configuration uses ${key}=${expectedValue}`,
            severity: 'info'
          });
        }
      });
    }

    // Security checks
    const securityChecks = SECURITY_CHECKS[provider as keyof typeof SECURITY_CHECKS] || [];
    securityChecks.forEach(({ check, message, severity }) => {
      const value = credentials[check];
      if (check === 'ssl' && !value) {
        validationResults.issues.push({
          field: check,
          message,
          severity,
          fix: { [check]: true }
        });
        validationResults.securityScore -= severity === 'high' ? 30 : severity === 'medium' ? 15 : 5;
        validationResults.isValid = false;
      }
    });

    // Provider-specific validations
    switch (provider) {
      case 'postgresql':
      case 'mysql':
        if (!credentials.host || credentials.host === 'localhost') {
          validationResults.suggestions.push({
            field: 'host',
            message: 'Localhost connections may not work in production environments',
            severity: 'warning'
          });
        }
        if (!credentials.database) {
          validationResults.issues.push({
            field: 'database',
            message: 'Database name is required',
            severity: 'high'
          });
          validationResults.isValid = false;
        }
        break;

      case 'mongodb':
        if (!credentials.connectionString && !credentials.host) {
          validationResults.issues.push({
            field: 'connectionString',
            message: 'Either connection string or host is required',
            severity: 'high'
          });
          validationResults.isValid = false;
        }
        break;

      case 'firebase':
        if (!credentials.projectId || !credentials.apiKey) {
          validationResults.issues.push({
            field: 'credentials',
            message: 'Firebase requires projectId and apiKey',
            severity: 'high'
          });
          validationResults.isValid = false;
        }
        break;

      case 'supabase':
        if (!credentials.projectUrl || !credentials.anonKey) {
          validationResults.issues.push({
            field: 'credentials',
            message: 'Supabase requires project URL and anon key',
            severity: 'high'
          });
          validationResults.isValid = false;
        }
        break;
    }

    // Initialize Supabase to fetch similar successful patterns
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get successful patterns for comparison
    const { data: successPatterns } = await supabase
      .from('database_connection_patterns')
      .select('*')
      .eq('provider', provider)
      .order('success_count', { ascending: false })
      .limit(1);

    if (successPatterns && successPatterns.length > 0) {
      const pattern = successPatterns[0];
      validationResults.suggestions.push({
        type: 'pattern',
        message: `This configuration has been successfully used ${pattern.success_count} times`,
        configuration: pattern.configuration,
        severity: 'info'
      });
    }

    console.log(`✅ Validation complete. Security score: ${validationResults.securityScore}/100`);

    return new Response(
      JSON.stringify({
        success: true,
        validation: validationResults
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Error validating configuration:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Validation failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
