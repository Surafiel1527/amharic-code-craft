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
    const { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey } = await req.json();

    console.log('🔍 Testing Supabase connection...');
    
    // Validation results
    const results: any = {
      success: false,
      urlValid: false,
      anonKeyValid: false,
      serviceRoleKeyValid: false,
      canCreateTables: false,
      hasExecuteMigrationFunction: false,
      errors: [],
      warnings: [],
      recommendations: []
    };

    // Step 1: Validate URL format
    try {
      const url = new URL(supabaseUrl);
      if (!url.hostname.includes('supabase.co') && !url.hostname.includes('localhost')) {
        results.errors.push('URL does not appear to be a valid Supabase URL');
        results.recommendations.push('URL should be in format: https://[project-id].supabase.co');
      } else {
        results.urlValid = true;
      }
    } catch (e) {
      results.errors.push('Invalid URL format');
      results.recommendations.push('Please check your Supabase project URL');
    }

    if (!results.urlValid) {
      return new Response(JSON.stringify(results), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 2: Test anon key - basic connection
    try {
      console.log('Testing anon key...');
      const anonClient = createClient(supabaseUrl, supabaseAnonKey);
      
      // Try a simple query to test connectivity
      const { error: anonError } = await anonClient.from('_temp_test').select('*').limit(1);
      
      // We expect an error about the table not existing - that's fine, it means the key works
      if (!anonError || anonError.message.includes('relation') || anonError.message.includes('does not exist')) {
        results.anonKeyValid = true;
      } else if (anonError.message.includes('JWT') || anonError.message.includes('authentication')) {
        results.errors.push('Anon key is invalid or expired');
        results.recommendations.push('Please get a fresh anon key from Settings → API in your Supabase dashboard');
      } else {
        results.warnings.push(`Anon key test warning: ${anonError.message}`);
        results.anonKeyValid = true; // Assume valid if not auth error
      }
    } catch (e) {
      results.errors.push(`Anon key connection failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
      results.recommendations.push('Check if your Supabase project is active and accessible');
    }

    // Step 3: Test service role key - admin access
    if (supabaseServiceRoleKey) {
      try {
        console.log('Testing service role key...');
        const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey);
        
        // Try to check if execute_migration function exists
        const { error: funcError } = await serviceClient.rpc('execute_migration', {
          migration_sql: 'SELECT 1;'
        });
        
        if (!funcError) {
          results.serviceRoleKeyValid = true;
          results.canCreateTables = true;
          results.hasExecuteMigrationFunction = true;
        } else if (funcError.message.includes('function') && funcError.message.includes('does not exist')) {
          // Service role key works, but execute_migration function doesn't exist
          results.serviceRoleKeyValid = true;
          results.warnings.push('execute_migration function not found in your database');
          results.recommendations.push('You need to create the execute_migration function. See instructions at: https://docs.lovable.dev/setup');
        } else if (funcError.message.includes('JWT') || funcError.message.includes('authentication')) {
          results.errors.push('Service role key is invalid or expired');
          results.recommendations.push('Please get a fresh service_role key from Settings → API in your Supabase dashboard');
        } else {
          results.serviceRoleKeyValid = true;
          results.warnings.push(`Service role test warning: ${funcError.message}`);
        }
      } catch (e) {
        results.errors.push(`Service role key failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
    } else {
      results.warnings.push('No service role key provided - table creation will not be possible');
      results.recommendations.push('Add your service_role key to enable database table generation');
    }

    // Step 4: If function is missing, provide setup SQL
    if (!results.hasExecuteMigrationFunction && results.serviceRoleKeyValid) {
      results.success = false;
      results.requiresSetup = true;
      results.setupSQL = `CREATE OR REPLACE FUNCTION public.execute_migration(migration_sql text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  error_message text;
BEGIN
  BEGIN
    EXECUTE migration_sql;
    result := jsonb_build_object(
      'success', true,
      'message', 'Migration executed successfully'
    );
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;
    result := jsonb_build_object(
      'success', false,
      'error', error_message
    );
  END;
  RETURN result;
END;
$$;`;
      results.errors.push('Required database function not found');
      results.recommendations.push('One-time setup: Run the SQL above in your Supabase SQL Editor');
      results.recommendations.push('1. Open Supabase Dashboard → SQL Editor');
      results.recommendations.push('2. Create new query and paste the SQL');
      results.recommendations.push('3. Click "Run" to execute');
      results.recommendations.push('4. Return here and test connection again');
    }
    
    // Step 5: Overall assessment
    if (results.urlValid && results.anonKeyValid && results.errors.length === 0) {
      results.success = true;
      
      if (!results.serviceRoleKeyValid) {
        results.warnings.push('Service role key not validated - some features may be limited');
      }
    }

    console.log('✅ Connection test complete:', results);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Connection test error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      recommendations: ['Please check all your credentials and try again']
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});