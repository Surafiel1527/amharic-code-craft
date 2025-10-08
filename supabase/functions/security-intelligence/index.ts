import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  generateUserRLSPolicy, 
  generateProtectedRoute, 
  generateConfirmDialog, 
  generateUseProfileHook 
} from '../_shared/securityPatterns.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Security Intelligence Engine
 * Auto-applies security best practices to generated code
 */

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      generatedCode, 
      tableName, 
      operation, 
      projectContext,
      userId 
    } = await req.json();

    console.log('🔒 Security Intelligence analyzing:', { tableName, operation, userId });

    const securityAnalysis = {
      risks: [] as string[],
      recommendations: [] as string[],
      auto_fixes: [] as any[],
      rls_policies: [] as string[],
      requires_approval: false
    };

    // **1. Check for missing RLS**
    if (tableName && !await hasRLS(supabase, tableName)) {
      securityAnalysis.risks.push(`Table '${tableName}' has no RLS enabled`);
      securityAnalysis.recommendations.push('Enable RLS and add user-based policies');
      securityAnalysis.auto_fixes.push({
        type: 'enable_rls',
        sql: `ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;`
      });
      securityAnalysis.rls_policies.push(generateUserRLSPolicy(tableName));
      securityAnalysis.requires_approval = true;
    }

    // **2. Check for auth requirements**
    if (operation === 'insert' || operation === 'update' || operation === 'delete') {
      if (!generatedCode.includes('auth.uid()')) {
        securityAnalysis.risks.push('Mutation without user authentication check');
        securityAnalysis.recommendations.push('Add user_id column linked to auth.uid()');
        securityAnalysis.requires_approval = true;
      }
    }

    // **3. Check for PII exposure**
    const piiColumns = ['email', 'phone', 'address', 'ssn', 'credit_card'];
    if (piiColumns.some(col => generatedCode.toLowerCase().includes(col))) {
      securityAnalysis.risks.push('Potential PII exposure detected');
      securityAnalysis.recommendations.push('Restrict public SELECT policies on PII columns');
      securityAnalysis.requires_approval = true;
    }

    // **4. Auto-generate secure patterns**
    const securePatterns = {
      protected_route: generateProtectedRoute(),
      confirm_dialog: generateConfirmDialog(),
      use_profile_hook: generateUseProfileHook()
    };

    // Log security event
    await supabase
      .from('security_events')
      .insert({
        user_id: userId,
        event_type: 'security_analysis',
        table_name: tableName,
        risks_detected: securityAnalysis.risks.length,
        auto_fixed: securityAnalysis.auto_fixes.length,
        metadata: {
          risks: securityAnalysis.risks,
          recommendations: securityAnalysis.recommendations
        }
      });

    return new Response(JSON.stringify({
      success: true,
      security_analysis: securityAnalysis,
      secure_patterns: securePatterns,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in security-intelligence:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper: Check if table has RLS enabled
async function hasRLS(supabase: any, tableName: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('execute_sql', {
      sql: `SELECT relrowsecurity FROM pg_class WHERE relname = '${tableName}'`
    });
    return data?.[0]?.relrowsecurity === true;
  } catch {
    return false;
  }
}

// All pattern generators moved to _shared/securityPatterns.ts
