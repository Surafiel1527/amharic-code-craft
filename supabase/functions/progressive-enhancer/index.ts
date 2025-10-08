import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Progressive Enhancement Engine
 * Handles "add X later" requests intelligently
 * Links new features to existing code without breaking things
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
      newFeature,
      existingFeature,
      conversationId,
      userId
    } = await req.json();

    console.log('🔗 Progressive Enhancer linking:', { newFeature, existingFeature });

    // **Get existing feature code**
    const { data: existingCode } = await supabase
      .from('generated_code')
      .select('*')
      .eq('conversation_id', conversationId)
      .ilike('component_name', `%${existingFeature}%`)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!existingCode || existingCode.length === 0) {
      return new Response(JSON.stringify({
        error: `No existing code found for feature: ${existingFeature}`,
        suggestion: 'Generate the base feature first, then add enhancements'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // **Analyze integration points**
    const integrationPlan = analyzeIntegrationPoints(newFeature, existingCode);

    // **Generate enhancement code**
    const enhancementCode = await generateEnhancement(
      supabase,
      newFeature,
      existingFeature,
      existingCode,
      integrationPlan
    );

    return new Response(JSON.stringify({
      success: true,
      integration_plan: integrationPlan,
      enhancement_code: enhancementCode,
      affected_files: integrationPlan.files_to_modify,
      new_files: integrationPlan.files_to_create
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in progressive-enhancer:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Analyze where new feature integrates with existing code
function analyzeIntegrationPoints(newFeature: string, existingCode: any[]) {
  const plan = {
    files_to_modify: [] as string[],
    files_to_create: [] as string[],
    integration_points: [] as any[],
    requires_migration: false,
    requires_new_components: false
  };

  const newFeatureLower = newFeature.toLowerCase();

  // Detect common integration patterns
  if (newFeatureLower.includes('auth') || newFeatureLower.includes('login')) {
    plan.requires_migration = true;
    plan.files_to_create.push('src/pages/Auth.tsx');
    plan.files_to_modify = existingCode
      .filter(code => code.file_path.includes('tsx'))
      .map(code => code.file_path);
    plan.integration_points.push({
      type: 'wrap_with_auth',
      description: 'Wrap existing components with ProtectedRoute',
      files: plan.files_to_modify
    });
  }

  if (newFeatureLower.includes('profile') || newFeatureLower.includes('settings')) {
    plan.files_to_create.push('src/pages/Settings.tsx');
    plan.integration_points.push({
      type: 'add_profile_page',
      description: 'Create profile/settings page and link to existing features'
    });
  }

  if (newFeatureLower.includes('terms') || newFeatureLower.includes('agreement')) {
    plan.files_to_create.push('src/components/TermsAgreement.tsx');
    plan.integration_points.push({
      type: 'add_to_signup',
      description: 'Add terms checkbox to existing signup form',
      target_file: 'src/pages/Auth.tsx'
    });
  }

  return plan;
}

// Generate enhancement code
async function generateEnhancement(
  supabase: any,
  newFeature: string,
  existingFeature: string,
  existingCode: any[],
  plan: any
) {
  // This would call the AI to generate the actual enhancement code
  // For now, return the plan
  return {
    migrations: plan.requires_migration ? ['CREATE TABLE...'] : [],
    new_components: plan.files_to_create,
    modifications: plan.files_to_modify.map((file: string) => ({
      file,
      changes: 'Wrap with ProtectedRoute or add integration'
    }))
  };
}
